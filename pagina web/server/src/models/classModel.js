import { db } from '../db/index.js';

const BOOKED_SUBQUERY = `(SELECT COUNT(*)::int FROM bookings b WHERE b.class_id = c.id AND b.status = 'confirmada')`;

const SELECT_CLASS = `
  SELECT c.id, c.title, c.description, c.category, c.level, c.instructor, c.starts_at,
         c.duration_min, c.capacity, c.price::float AS price, c.status, c.created_at, c.updated_at,
         ${BOOKED_SUBQUERY} AS booked
    FROM classes c`;

// Lista blanca de columnas de ordenamiento (nunca se interpola la entrada del usuario directamente).
const SORT_COLUMNS = {
  date: 'c.starts_at',
  price: 'c.price',
  title: 'c.title',
  spots: `(c.capacity - ${BOOKED_SUBQUERY})`
};

export const ClassModel = {
  async list({ q, category, level, status, from, to, upcoming, sort, order, page, limit }) {
    const where = [];
    const params = [];
    const add = (sql, value) => {
      params.push(value);
      where.push(sql.replace('?', `$${params.length}`));
    };
    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where.push(`(c.title ILIKE ${p} OR c.instructor ILIKE ${p} OR c.description ILIKE ${p})`);
    }
    if (category) add('c.category = ?', category);
    if (level) add('c.level = ?', level);
    if (status) add('c.status = ?', status);
    if (from) add('c.starts_at >= ?', from);
    if (to) add('c.starts_at <= ?', to);
    if (upcoming) where.push('c.starts_at >= NOW()');

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderCol = SORT_COLUMNS[sort] || SORT_COLUMNS.date;
    const orderDir = order === 'desc' ? 'DESC' : 'ASC';

    const total = (await db.query(`SELECT COUNT(*)::int AS n FROM classes c ${whereSql}`, params)).rows[0].n;
    params.push(limit, (page - 1) * limit);
    const { rows } = await db.query(
      `${SELECT_CLASS} ${whereSql} ORDER BY ${orderCol} ${orderDir}, c.id ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { items: rows, total };
  },

  async findById(id, runner = db) {
    const { rows } = await runner.query(`${SELECT_CLASS} WHERE c.id = $1`, [id]);
    return rows[0] || null;
  },

  async create(data, userId) {
    const { rows } = await db.query(
      `INSERT INTO classes (title, description, category, level, instructor, starts_at, duration_min, capacity, price, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [data.title, data.description, data.category, data.level, data.instructor, data.starts_at,
        data.duration_min, data.capacity, data.price, data.status || 'activa', userId]
    );
    return this.findById(rows[0].id);
  },

  async update(id, data) {
    const { rowCount } = await db.query(
      `UPDATE classes SET title=$1, description=$2, category=$3, level=$4, instructor=$5, starts_at=$6,
              duration_min=$7, capacity=$8, price=$9, status=$10, updated_at=NOW()
        WHERE id=$11`,
      [data.title, data.description, data.category, data.level, data.instructor, data.starts_at,
        data.duration_min, data.capacity, data.price, data.status || 'activa', id]
    );
    if (!rowCount) return null;
    return this.findById(id);
  },

  async remove(id) {
    const { rowCount } = await db.query('DELETE FROM classes WHERE id = $1', [id]);
    return rowCount > 0;
  },

  async lockForBooking(runner, id) {
    const { rows } = await runner.query(
      'SELECT id, starts_at, duration_min, capacity, status FROM classes WHERE id = $1 FOR UPDATE',
      [id]
    );
    return rows[0] || null;
  }
};
