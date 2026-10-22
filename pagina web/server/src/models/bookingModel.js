import { db } from '../db/index.js';

export const BookingModel = {
  async listByUser(userId, { status }) {
    const params = [userId];
    let statusSql = '';
    if (status) {
      params.push(status);
      statusSql = `AND b.status = $2`;
    }
    const { rows } = await db.query(
      `SELECT b.id, b.status, b.created_at, b.updated_at,
              c.id AS class_id, c.title, c.category, c.level, c.instructor, c.starts_at,
              c.duration_min, c.price::float AS price, c.status AS class_status
         FROM bookings b JOIN classes c ON c.id = b.class_id
        WHERE b.user_id = $1 ${statusSql}
        ORDER BY c.starts_at ASC`,
      params
    );
    return rows;
  },

  async listByClass(classId) {
    const { rows } = await db.query(
      `SELECT b.id, b.status, b.created_at, u.id AS user_id, u.name, u.email
         FROM bookings b JOIN users u ON u.id = b.user_id
        WHERE b.class_id = $1
        ORDER BY b.created_at ASC`,
      [classId]
    );
    return rows;
  },

  async findById(id, runner = db) {
    const { rows } = await runner.query(
      `SELECT b.id, b.user_id, b.class_id, b.status, c.starts_at
         FROM bookings b JOIN classes c ON c.id = b.class_id WHERE b.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByUserAndClass(runner, userId, classId) {
    const { rows } = await runner.query('SELECT id, status FROM bookings WHERE user_id = $1 AND class_id = $2', [userId, classId]);
    return rows[0] || null;
  },

  async countConfirmed(runner, classId) {
    const { rows } = await runner.query(
      `SELECT COUNT(*)::int AS n FROM bookings WHERE class_id = $1 AND status = 'confirmada'`,
      [classId]
    );
    return rows[0].n;
  },

  /** Busca reservas confirmadas del usuario cuyo horario se solapa con [start, end). */
  async findOverlap(runner, userId, classId, startIso, durationMin) {
    const { rows } = await runner.query(
      `SELECT c.title FROM bookings b JOIN classes c ON c.id = b.class_id
        WHERE b.user_id = $1 AND b.status = 'confirmada' AND c.id <> $2 AND c.status = 'activa'
          AND c.starts_at < ($3::timestamptz + make_interval(mins => $4::int))
          AND (c.starts_at + make_interval(mins => c.duration_min)) > $3::timestamptz
        LIMIT 1`,
      [userId, classId, startIso, durationMin]
    );
    return rows[0] || null;
  },

  async insert(runner, userId, classId) {
    const { rows } = await runner.query(
      `INSERT INTO bookings (user_id, class_id) VALUES ($1,$2) RETURNING id, status, created_at`,
      [userId, classId]
    );
    return rows[0];
  },

  async setStatus(runner, id, status) {
    const { rows } = await runner.query(
      `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status, updated_at`,
      [status, id]
    );
    return rows[0];
  }
};
