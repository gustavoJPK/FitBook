import { db } from '../db/index.js';

export const StatsModel = {
  async summary() {
    const [totals, byCategory, topClasses, recent] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM users) AS users,
          (SELECT COUNT(*)::int FROM users WHERE role = 'admin') AS admins,
          (SELECT COUNT(*)::int FROM classes) AS classes,
          (SELECT COUNT(*)::int FROM classes WHERE status = 'activa' AND starts_at >= NOW()) AS upcoming_classes,
          (SELECT COUNT(*)::int FROM bookings WHERE status = 'confirmada') AS confirmed_bookings,
          (SELECT COUNT(*)::int FROM bookings WHERE status = 'cancelada') AS cancelled_bookings,
          (SELECT COALESCE(SUM(c.price), 0)::float FROM bookings b JOIN classes c ON c.id = b.class_id
             WHERE b.status = 'confirmada') AS revenue,
          (SELECT COALESCE(SUM(capacity), 0)::int FROM classes WHERE status = 'activa' AND starts_at >= NOW()) AS upcoming_capacity,
          (SELECT COUNT(*)::int FROM bookings b JOIN classes c ON c.id = b.class_id
             WHERE b.status = 'confirmada' AND c.status = 'activa' AND c.starts_at >= NOW()) AS upcoming_booked`),
      db.query(`
        SELECT c.category, COUNT(b.id)::int AS bookings
          FROM classes c LEFT JOIN bookings b ON b.class_id = c.id AND b.status = 'confirmada'
         GROUP BY c.category ORDER BY bookings DESC, c.category`),
      db.query(`
        SELECT c.id, c.title, c.capacity,
               COUNT(b.id)::int AS booked
          FROM classes c LEFT JOIN bookings b ON b.class_id = c.id AND b.status = 'confirmada'
         WHERE c.starts_at >= NOW()
         GROUP BY c.id ORDER BY booked DESC, c.starts_at ASC LIMIT 5`),
      db.query(`
        SELECT b.id, b.status, b.created_at, u.name AS user_name, c.title AS class_title
          FROM bookings b JOIN users u ON u.id = b.user_id JOIN classes c ON c.id = b.class_id
         ORDER BY b.updated_at DESC LIMIT 6`)
    ]);
    const t = totals.rows[0];
    t.occupancy = t.upcoming_capacity ? Math.round((t.upcoming_booked / t.upcoming_capacity) * 100) : 0;
    return { totals: t, byCategory: byCategory.rows, topClasses: topClasses.rows, recent: recent.rows };
  }
};
