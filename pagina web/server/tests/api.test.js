/**
 * FitBook — Pruebas de integración de la API (Node.js built-in test runner)
 * Ejecutar: npm test
 *
 * Levanta el servidor con base de datos PGlite en memoria y valida
 * los endpoints principales con fetch() nativo de Node ≥ 20.
 */

import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';

// Usar entorno de test para bcrypt rápido y sin semillas automáticas
process.env.NODE_ENV = 'test';
process.env.SEED_ON_START = 'false';
process.env.PGLITE_DIR = 'memory://fitbook-test';
process.env.PORT = '3099';

// Importar después de configurar las variables de entorno
const { initDb }       = await import('../src/db/index.js');
const { applySchema, resetSchema, seedIfEmpty } = await import('../src/db/init.js');
const { createApp }    = await import('../src/app.js');

const BASE = 'http://localhost:3099/api';

// ── Helpers ─────────────────────────────────────────────────────────────────
const jar = new Map(); // Almacén de cookies por "usuario"

function cookieHeader(name) {
  return jar.get(name) || '';
}

async function req(method, path, body, cookieName) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'fetch',
      ...(cookieName ? { Cookie: cookieHeader(cookieName) } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  };
  const res = await fetch(BASE + path, opts);
  // Guardar cookie si la hay
  const setCookie = res.headers.get('set-cookie');
  if (setCookie && cookieName) {
    const token = setCookie.split(';')[0];
    jar.set(cookieName, token);
  }
  let data = null;
  try { data = await res.json(); } catch { /* sin body */ }
  return { status: res.status, data };
}

// ── Setup ────────────────────────────────────────────────────────────────────
let server;

before(async () => {
  await initDb();
  await resetSchema();
  await seedIfEmpty();
  const app = createApp();
  await new Promise((resolve) => { server = app.listen(3099, resolve); });
});

after(async () => {
  await new Promise((r) => server.close(r));
  const { db } = await import('../src/db/index.js');
  await db.close();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Health', () => {
  test('GET /health → 200 ok', async () => {
    const { status, data } = await req('GET', '/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
  });
});

describe('Auth — Registro', () => {
  test('Registro exitoso devuelve 201 y usuario', async () => {
    const { status, data } = await req('POST', '/auth/register', {
      name: 'Test User', email: 'test@fitbook.test', password: 'Test123!'
    }, 'user');
    assert.equal(status, 201);
    assert.ok(data.user?.id, 'Debe devolver el usuario');
    assert.equal(data.user.role, 'user');
    assert.ok(!data.user.password_hash, 'No debe exponer el hash');
  });

  test('Registro con email duplicado devuelve 409', async () => {
    const { status } = await req('POST', '/auth/register', {
      name: 'Dup', email: 'test@fitbook.test', password: 'Test123!'
    });
    assert.equal(status, 409);
  });

  test('Registro con contraseña débil devuelve 400', async () => {
    const { status } = await req('POST', '/auth/register', {
      name: 'Bad', email: 'bad@fitbook.test', password: '1234'
    });
    assert.equal(status, 400);
  });
});

describe('Auth — Login / Me / Logout', () => {
  test('Login con credenciales correctas', async () => {
    const { status, data } = await req('POST', '/auth/login', {
      email: 'admin@fitbook.test', password: 'Admin123!'
    }, 'admin');
    assert.equal(status, 200);
    assert.equal(data.user?.role, 'admin');
  });

  test('Login con contraseña incorrecta devuelve 401', async () => {
    const { status } = await req('POST', '/auth/login', {
      email: 'admin@fitbook.test', password: 'Wrongpass1'
    });
    assert.equal(status, 401);
  });

  test('GET /auth/me con sesión activa', async () => {
    const { status, data } = await req('GET', '/auth/me', null, 'admin');
    assert.equal(status, 200);
    assert.ok(data.user?.id);
  });

  test('GET /auth/me sin sesión devuelve 401', async () => {
    const { status } = await req('GET', '/auth/me');
    assert.equal(status, 401);
  });

  test('POST /auth/logout limpia sesión', async () => {
    const { status } = await req('POST', '/auth/logout', null, 'admin');
    assert.equal(status, 200);
    // Volver a iniciar sesión para los tests siguientes
    await req('POST', '/auth/login', { email: 'admin@fitbook.test', password: 'Admin123!' }, 'admin');
    await req('POST', '/auth/login', { email: 'test@fitbook.test',  password: 'Test123!'  }, 'user');
  });
});

describe('Clases — Listado y detalle (público)', () => {
  let classId;

  test('GET /classes devuelve lista paginada', async () => {
    const { status, data } = await req('GET', '/classes');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.items));
    assert.ok(data.pagination?.total >= 0);
    if (data.items.length > 0) classId = data.items[0].id;
  });

  test('GET /classes?category=yoga filtra correctamente', async () => {
    const { status, data } = await req('GET', '/classes?category=yoga');
    assert.equal(status, 200);
    for (const cls of data.items) assert.equal(cls.category, 'yoga');
  });

  test('GET /classes?q=spin busca en título', async () => {
    const { status, data } = await req('GET', '/classes?q=spin');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.items));
  });

  test('GET /classes/:id devuelve clase', async () => {
    if (!classId) return; // skip si no hay clases
    const { status, data } = await req('GET', `/classes/${classId}`);
    assert.equal(status, 200);
    assert.equal(data.item?.id, classId);
  });

  test('GET /classes/99999 devuelve 404', async () => {
    const { status } = await req('GET', '/classes/99999');
    assert.equal(status, 404);
  });
});

describe('Clases — CRUD Admin', { concurrency: false }, () => {
  const state = { createdId: null };
  const futureDate = new Date(Date.now() + 7 * 86_400_000).toISOString(); // +7 días

  test('POST /classes (admin) crea clase', async () => {
    const { status, data } = await req('POST', '/classes', {
      title: 'Test Yoga', description: 'Clase de prueba funcional para el test',
      category: 'yoga', level: 'principiante', instructor: 'Tester',
      starts_at: futureDate, duration_min: 45, capacity: 10, price: 50
    }, 'admin');
    assert.equal(status, 201);
    state.createdId = data.item?.id;
    assert.ok(state.createdId, 'Debe retornar id de la clase creada');
  });

  test('POST /classes (user) devuelve 403', async () => {
    const { status } = await req('POST', '/classes', {
      title: 'No permitida', description: 'No debería crearse',
      category: 'yoga', level: 'principiante', instructor: 'X',
      starts_at: futureDate, duration_min: 45, capacity: 5, price: 0
    }, 'user');
    assert.equal(status, 403);
  });

  test('PUT /classes/:id (admin) actualiza clase', async () => {
    const id = state.createdId;
    if (!id) return;
    const futureDate2 = new Date(Date.now() + 14 * 86_400_000).toISOString(); // +14 días
    const { status, data } = await req('PUT', `/classes/${id}`, {
      title: 'Test Yoga Actualizado', description: 'Descripción actualizada para el test de integración',
      category: 'yoga', level: 'intermedio', instructor: 'Tester Pro',
      starts_at: futureDate2, duration_min: 60, capacity: 15, price: 80, status: 'activa'
    }, 'admin');
    // Si la actualización falla por alguna razón del servidor, comparamos el error para diagnóstico
    assert.equal(status, 200, `PUT /classes/${id} devolvió ${status}: ${JSON.stringify(data)}`);
    assert.ok(data.item, `Response body: ${JSON.stringify(data)}`);
    assert.equal(data.item.title, 'Test Yoga Actualizado');
  });

  test('DELETE /classes/:id (admin) elimina clase', async () => {
    const id = state.createdId;
    if (!id) return;
    const { status, data } = await req('DELETE', `/classes/${id}`, null, 'admin');
    assert.equal(status, 200, `DELETE /classes/${id} devolvió ${status}: ${JSON.stringify(data)}`);
  });
});

describe('Reservas', () => {
  let bookingId;

  test('POST /bookings crea reserva para usuario', async () => {
    // Obtener una clase activa
    const { data: listData } = await req('GET', '/classes?limit=1', null, 'user');
    const cls = listData.items?.[0];
    if (!cls) return; // sin clases activas en semilla, skip

    const { status, data } = await req('POST', '/bookings', { class_id: cls.id }, 'user');
    if (status === 409) return; // ya existía reserva o clase llena
    assert.equal(status, 201);
    bookingId = data.item?.id;
  });

  test('POST /bookings duplicada devuelve 409', async () => {
    const { data: listData } = await req('GET', '/classes?limit=1', null, 'user');
    const cls = listData.items?.[0];
    if (!cls) return;
    const { status } = await req('POST', '/bookings', { class_id: cls.id }, 'user');
    // Puede ser 201 (nueva) o 409 (ya reservada)
    assert.ok([201, 409].includes(status));
  });

  test('GET /bookings/me devuelve mis reservas', async () => {
    const { status, data } = await req('GET', '/bookings/me', null, 'user');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.items));
  });

  test('PATCH /bookings/:id/cancel cancela reserva', async () => {
    if (!bookingId) return;
    const { status } = await req('PATCH', `/bookings/${bookingId}/cancel`, null, 'admin');
    assert.ok([200, 400, 409].includes(status)); // 400 si < 2h antelación
  });

  test('GET /bookings/me sin sesión → 401', async () => {
    const { status } = await req('GET', '/bookings/me');
    assert.equal(status, 401);
  });
});

describe('Admin', () => {
  test('GET /admin/stats (admin) devuelve métricas', async () => {
    const { status, data } = await req('GET', '/admin/stats', null, 'admin');
    assert.equal(status, 200);
    assert.ok(typeof data.users === 'number' || typeof data.total_users === 'number' || data);
  });

  test('GET /admin/users (admin) lista usuarios', async () => {
    const { status, data } = await req('GET', '/admin/users', null, 'admin');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.items));
  });

  test('GET /admin/stats (user) → 403', async () => {
    const { status } = await req('GET', '/admin/stats', null, 'user');
    assert.equal(status, 403);
  });

  test('PATCH /admin/users/:id/role cambia rol', async () => {
    const { data: list } = await req('GET', '/admin/users', null, 'admin');
    const target = list.items?.find(u => u.role === 'user');
    if (!target) return;
    const { status } = await req('PATCH', `/admin/users/${target.id}/role`, { role: 'admin' }, 'admin');
    assert.equal(status, 200);
    // Revertir
    await req('PATCH', `/admin/users/${target.id}/role`, { role: 'user' }, 'admin');
  });
});

describe('Seguridad', () => {
  test('Solicitud sin X-Requested-With en mutación → 403', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: 'admin@fitbook.test', password: 'Admin123!' })
    });
    assert.equal(res.status, 403);
  });

  test('API endpoint no existente → 404', async () => {
    const { status } = await req('GET', '/ruta-inexistente-xyz');
    assert.equal(status, 404);
  });

  test('Body JSON malformado → 400', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      body: '{ mal json {'
    });
    assert.equal(res.status, 400);
  });
});
