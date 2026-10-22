import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { db } from './index.js';
import { config } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function applySchema() {
  const sql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.exec(sql);
}

export async function resetSchema() {
  await db.exec('DROP TABLE IF EXISTS bookings; DROP TABLE IF EXISTS classes; DROP TABLE IF EXISTS users;');
  await applySchema();
}

/** Datos de prueba ficticios (no sensibles). */
export async function seedIfEmpty() {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM users');
  if (rows[0].n > 0) return false;

  const rounds = config.isTest ? 4 : config.bcryptRounds;
  const adminHash = await bcrypt.hash('Admin123!', rounds);
  const userHash = await bcrypt.hash('Usuario123!', rounds);

  const admin = await db.query(
    `INSERT INTO users (name, email, password_hash, phone, role) VALUES ($1,$2,$3,$4,'admin') RETURNING id`,
    ['Admin FitBook', 'admin@fitbook.test', adminHash, '5550000000']
  );
  const adminId = admin.rows[0].id;
  const u1 = await db.query(
    `INSERT INTO users (name, email, password_hash, phone) VALUES ($1,$2,$3,$4) RETURNING id`,
    ['Laura Gómez', 'laura@fitbook.test', userHash, '5551112233']
  );
  const u2 = await db.query(
    `INSERT INTO users (name, email, password_hash, phone) VALUES ($1,$2,$3,$4) RETURNING id`,
    ['Carlos Ruiz', 'carlos@fitbook.test', userHash, null]
  );

  const templates = [
    ['Yoga al amanecer', 'Secuencias suaves de Hatha yoga para despertar el cuerpo y mejorar la flexibilidad.', 'yoga', 'principiante', 'Ana Torres', 1, 7, 60, 15, 80],
    ['Spinning extremo', 'Rutina de ciclismo indoor por intervalos de alta intensidad con música motivadora.', 'spinning', 'avanzado', 'Diego Méndez', 1, 18, 45, 20, 120],
    ['CrossFit WOD', 'Entrenamiento del día con movimientos funcionales, halterofilia y gimnasia.', 'crossfit', 'intermedio', 'Marco Silva', 2, 19, 60, 12, 150],
    ['Pilates core', 'Fortalecimiento del centro del cuerpo, postura y control respiratorio.', 'pilates', 'principiante', 'Sofía Rivas', 2, 9, 50, 10, 100],
    ['Funcional en circuito', 'Circuito de estaciones con peso corporal, kettlebells y bandas elásticas.', 'funcional', 'intermedio', 'Luis Pardo', 3, 17, 45, 18, 90],
    ['Boxeo fitness', 'Técnica básica de golpeo, desplazamientos y acondicionamiento con costales.', 'boxeo', 'intermedio', 'Rocío Vega', 3, 20, 60, 14, 130],
    ['Zumba party', 'Clase de baile aeróbico con ritmos latinos para quemar calorías divirtiéndote.', 'baile', 'principiante', 'Karla Núñez', 4, 18, 55, 25, 70],
    ['Yoga vinyasa', 'Flujo dinámico que sincroniza respiración y movimiento. Requiere experiencia previa.', 'yoga', 'avanzado', 'Ana Torres', 4, 8, 75, 12, 110],
    ['Spinning base', 'Introducción al ciclismo indoor: postura, cadencia y zonas de esfuerzo.', 'spinning', 'principiante', 'Diego Méndez', 5, 7, 40, 20, 80],
    ['Pilates reformer', 'Trabajo en máquina reformer para tonificar con bajo impacto articular.', 'pilates', 'avanzado', 'Sofía Rivas', 5, 10, 50, 2, 200],
    ['HIIT funcional', 'Intervalos de alta intensidad para mejorar resistencia cardiovascular.', 'funcional', 'avanzado', 'Luis Pardo', 6, 19, 30, 16, 95],
    ['Salsa fitness', 'Coreografías de salsa adaptadas al entrenamiento cardiovascular.', 'baile', 'intermedio', 'Karla Núñez', 7, 19, 60, 20, 75]
  ];

  const classIds = [];
  for (const [title, description, category, level, instructor, dayOffset, hour, duration, capacity, price] of templates) {
    const start = new Date();
    start.setDate(start.getDate() + dayOffset);
    start.setHours(hour, 0, 0, 0);
    const r = await db.query(
      `INSERT INTO classes (title, description, category, level, instructor, starts_at, duration_min, capacity, price, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [title, description, category, level, instructor, start.toISOString(), duration, capacity, price, adminId]
    );
    classIds.push(r.rows[0].id);
  }

  const bookings = [
    [u1.rows[0].id, classIds[0]],
    [u1.rows[0].id, classIds[2]],
    [u2.rows[0].id, classIds[0]],
    [u2.rows[0].id, classIds[9]],
    [u1.rows[0].id, classIds[9]]
  ];
  for (const [userId, classId] of bookings) {
    await db.query('INSERT INTO bookings (user_id, class_id) VALUES ($1,$2)', [userId, classId]);
  }
  return true;
}

// Ejecución directa: npm run db:init | db:seed | db:reset
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const { initDb } = await import('./index.js');
  await initDb();
  const args = process.argv.slice(2);
  if (args.includes('--reset')) {
    await resetSchema();
    console.log('Esquema reiniciado.');
  } else {
    await applySchema();
    console.log('Esquema aplicado.');
  }
  if (args.includes('--seed')) {
    const seeded = await seedIfEmpty();
    console.log(seeded ? 'Datos de prueba insertados.' : 'La base ya tenía datos; no se insertó nada.');
  }
  await db.close();
}
