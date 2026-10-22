import { db } from '../db/index.js';

const PUBLIC_FIELDS = 'id, name, email, phone, role, created_at';

export const UserModel = {
  async findByEmailWithHash(email) {
    const { rows } = await db.query(`SELECT ${PUBLIC_FIELDS}, password_hash FROM users WHERE email = $1`, [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await db.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async emailExists(email) {
    const { rows } = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
    return rows.length > 0;
  },

  async create({ name, email, passwordHash, phone }) {
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, phone) VALUES ($1,$2,$3,$4) RETURNING ${PUBLIC_FIELDS}`,
      [name, email, passwordHash, phone]
    );
    return rows[0];
  },

  async updateProfile(id, { name, phone }) {
    const { rows } = await db.query(
      `UPDATE users SET name = $1, phone = $2 WHERE id = $3 RETURNING ${PUBLIC_FIELDS}`,
      [name, phone, id]
    );
    return rows[0] || null;
  },

  async list({ q, role, page, limit }) {
    const where = [];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    if (role) {
      params.push(role);
      where.push(`u.role = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = (await db.query(`SELECT COUNT(*)::int AS n FROM users u ${whereSql}`, params)).rows[0].n;
    params.push(limit, (page - 1) * limit);
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              (SELECT COUNT(*)::int FROM bookings b WHERE b.user_id = u.id AND b.status = 'confirmada') AS active_bookings
         FROM users u ${whereSql}
        ORDER BY u.created_at DESC, u.id DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { items: rows, total };
  },

  async updateRole(id, role) {
    const { rows } = await db.query(`UPDATE users SET role = $1 WHERE id = $2 RETURNING ${PUBLIC_FIELDS}`, [role, id]);
    return rows[0] || null;
  },

  async remove(id) {
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount > 0;
  },

  async countAdmins() {
    const { rows } = await db.query(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'`);
    return rows[0].n;
  }
};
