import { ClassModel } from '../models/classModel.js';
import { BookingModel } from '../models/bookingModel.js';
import { AppError } from '../utils/AppError.js';
import { CATEGORIES, LEVELS, CLASS_STATUS } from '../validators/schemas.js';

const clampInt = (v, def, min, max) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : def;
};
const validDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export const ClassService = {
  /** Normaliza los parámetros de consulta: valores desconocidos se ignoran. */
  parseListQuery(query, { isAdmin }) {
    const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
    let toDate = validDate(query.to);
    if (toDate && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
      // Fecha sin hora: incluir todo el día
      toDate = new Date(new Date(query.to).getTime() + 86399999).toISOString();
    }
    const scopeAll = isAdmin && query.scope === 'all';
    return {
      q,
      category: CATEGORIES.includes(query.category) ? query.category : null,
      level: LEVELS.includes(query.level) ? query.level : null,
      // Usuarios estándar solo ven clases activas y futuras
      status: scopeAll ? (CLASS_STATUS.includes(query.status) ? query.status : null) : 'activa',
      upcoming: !scopeAll,
      from: validDate(query.from),
      to: toDate,
      sort: ['date', 'price', 'title', 'spots'].includes(query.sort) ? query.sort : 'date',
      order: query.order === 'desc' ? 'desc' : 'asc',
      page: clampInt(query.page, 1, 1, 10000),
      limit: clampInt(query.limit, 9, 1, 50)
    };
  },

  async list(query, user) {
    const params = this.parseListQuery(query, { isAdmin: user?.role === 'admin' });
    const { items, total } = await ClassModel.list(params);
    return {
      items,
      pagination: { page: params.page, limit: params.limit, total, pages: Math.max(1, Math.ceil(total / params.limit)) }
    };
  },

  async get(id, user) {
    const cls = await ClassModel.findById(id);
    if (!cls) throw AppError.notFound('La clase no existe');
    if (user?.role !== 'admin' && cls.status !== 'activa') throw AppError.notFound('La clase no existe');
    return cls;
  },

  async create(data, userId) {
    if (new Date(data.starts_at).getTime() < Date.now()) {
      throw AppError.badRequest('Datos inválidos', { starts_at: 'La fecha debe ser futura' });
    }
    return ClassModel.create(data, userId);
  },

  async update(id, data) {
    const current = await ClassModel.findById(id);
    if (!current) throw AppError.notFound('La clase no existe');
    if (data.capacity < current.booked) {
      throw AppError.badRequest('Datos inválidos', {
        capacity: `El cupo no puede ser menor que las reservas confirmadas (${current.booked})`
      });
    }
    return ClassModel.update(id, data);
  },

  async remove(id) {
    const ok = await ClassModel.remove(id);
    if (!ok) throw AppError.notFound('La clase no existe');
  },

  async attendees(id) {
    const cls = await ClassModel.findById(id);
    if (!cls) throw AppError.notFound('La clase no existe');
    return BookingModel.listByClass(id);
  }
};
