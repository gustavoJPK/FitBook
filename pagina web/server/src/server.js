import { config } from './config/env.js';
import { initDb, db } from './db/index.js';
import { applySchema, seedIfEmpty } from './db/init.js';
import { createApp } from './app.js';

async function main() {
  await initDb();
  await applySchema();
  if (config.seedOnStart && (await seedIfEmpty())) {
    console.log('[db] Datos de prueba insertados.');
  }
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[server] FitBook escuchando en http://localhost:${config.port} (BD: ${db.engine()})`);
  });

  const shutdown = async () => {
    server.close();
    await db.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[server] Error al iniciar:', err.message);
  process.exit(1);
});
