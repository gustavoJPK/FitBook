import { config } from '../config/env.js';

/**
 * Capa de acceso a datos. Expone una interfaz única (query / tx / exec)
 * sobre dos motores PostgreSQL:
 *  - `pg` (servidor PostgreSQL real) cuando existe DATABASE_URL.
 *  - PGlite (PostgreSQL embebido, persistido en disco) para desarrollo local.
 * Todas las consultas son parametrizadas ($1, $2...) para evitar inyección SQL.
 */
let impl = null;

export async function initDb() {
  if (impl) return impl;
  if (config.databaseUrl) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: config.dbSsl ? { rejectUnauthorized: false } : false,
      max: 10
    });
    impl = {
      engine: 'postgres',
      query: (text, params) => pool.query(text, params),
      exec: (text) => pool.query(text),
      tx: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn({ query: (t, p) => client.query(t, p) });
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      },
      close: () => pool.end()
    };
  } else {
    // Limpieza de archivos de bloqueo huérfanos que provocan Aborted() en PGlite al reiniciar el proceso
    if (typeof config.pgliteDir === 'string' && !config.pgliteDir.startsWith('memory:')) {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const stalePid = path.join(config.pgliteDir, 'postmaster.pid');
      const staleLock = path.join(config.pgliteDir, '.s.PGSQL.5432.lock.out');
      try { if (fs.existsSync(stalePid)) fs.unlinkSync(stalePid); } catch {}
      try { if (fs.existsSync(staleLock)) fs.unlinkSync(staleLock); } catch {}
    }

    const { PGlite } = await import('@electric-sql/pglite');
    const pglite = new PGlite(config.pgliteDir);
    await pglite.waitReady;

    // Normaliza el resultado de PGlite al formato de `pg`:
    // PGlite usa `affectedRows` (integer), `pg` usa `rowCount` (integer | null).
    const normalize = (r) => ({ rows: r.rows ?? [], rowCount: r.affectedRows ?? r.rows?.length ?? 0 });
    const wrapQuery = (fn) => async (text, params) => normalize(await fn(text, params));

    impl = {
      engine: 'pglite',
      query: wrapQuery((t, p) => pglite.query(t, p)),
      exec: (text) => pglite.exec(text),
      tx: (fn) => pglite.transaction((tx) => fn({ query: wrapQuery((t, p) => tx.query(t, p)) })),
      close: () => pglite.close()
    };
  }
  return impl;
}

function ensure() {
  if (!impl) throw new Error('La base de datos no está inicializada');
  return impl;
}

export const db = {
  query: (text, params = []) => ensure().query(text, params),
  exec: (text) => ensure().exec(text),
  tx: (fn) => ensure().tx(fn),
  engine: () => ensure().engine,
  close: async () => {
    if (impl) {
      await impl.close();
      impl = null;
    }
  }
};
