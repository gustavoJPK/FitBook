import { db } from '../db/index.js';
import { ClassModel } from '../models/classModel.js';
import { BookingModel } from '../models/bookingModel.js';
import { AppError } from '../utils/AppError.js';

/** Horas mínimas de antelación para cancelar una reserva. */
export const CANCEL_LIMIT_HOURS = 2;
/** Máximo de reservas activas (futuras) por usuario. */
export const MAX_ACTIVE_BOOKINGS = 10;

export const BookingService = {
  listMine(userId, status) {
    const s = ['confirmada', 'cancelada'].includes(status) ? status : null;
    return BookingModel.listByUser(userId, { status: s });
  },

  /**
   * Reserva una plaza. Reglas de negocio:
   *  1. La clase existe, está activa y no ha comenzado.
   *  2. Hay cupo disponible (bloqueo de fila FOR UPDATE evita sobreventa concurrente).
   *  3. El usuario no tiene ya una reserva confirmada para esa clase.
   *  4. No se solapa con otra clase reservada por el mismo usuario.
   *  5. No supera el máximo de reservas activas.
   */
  async book(userId, classId) {
    return db.tx(async (tx) => {
      const cls = await ClassModel.lockForBooking(tx, classId);
      if (!cls) throw AppError.notFound('La clase no existe');
      if (cls.status !== 'activa') throw AppError.badRequest('La clase está cancelada');
      const startIso = new Date(cls.starts_at).toISOString();
      if (new Date(startIso).getTime() <= Date.now()) throw AppError.badRequest('La clase ya comenzó o finalizó');

      const existing = await BookingModel.findByUserAndClass(tx, userId, classId);
      if (existing?.status === 'confirmada') throw AppError.conflict('Ya tienes una reserva para esta clase');

      const booked = await BookingModel.countConfirmed(tx, classId);
      if (booked >= cls.capacity) throw AppError.conflict('La clase no tiene cupos disponibles');

      const overlap = await BookingModel.findOverlap(tx, userId, classId, startIso, cls.duration_min);
      if (overlap) throw AppError.conflict(`El horario se cruza con tu reserva de "${overlap.title}"`);

      const { rows } = await tx.query(
        `SELECT COUNT(*)::int AS n FROM bookings b JOIN classes c ON c.id = b.class_id
          WHERE b.user_id = $1 AND b.status = 'confirmada' AND c.starts_at >= NOW()`,
        [userId]
      );
      if (rows[0].n >= MAX_ACTIVE_BOOKINGS) {
        throw AppError.conflict(`Alcanzaste el máximo de ${MAX_ACTIVE_BOOKINGS} reservas activas`);
      }

      const booking = existing
        ? await BookingModel.setStatus(tx, existing.id, 'confirmada')
        : await BookingModel.insert(tx, userId, classId);
      return { ...booking, class_id: classId, spots_left: cls.capacity - booked - 1 };
    });
  },

  /** Cancela una reserva. Solo el dueño (o un administrador) y con antelación suficiente. */
  async cancel(bookingId, user) {
    return db.tx(async (tx) => {
      const booking = await BookingModel.findById(bookingId, tx);
      // Se responde 404 también si la reserva es ajena, para no revelar su existencia.
      if (!booking || (booking.user_id !== user.id && user.role !== 'admin')) {
        throw AppError.notFound('La reserva no existe');
      }
      if (booking.status === 'cancelada') throw AppError.conflict('La reserva ya estaba cancelada');
      const hoursLeft = (new Date(booking.starts_at).getTime() - Date.now()) / 3_600_000;
      if (user.role !== 'admin' && hoursLeft < CANCEL_LIMIT_HOURS) {
        throw AppError.badRequest(`Solo puedes cancelar con al menos ${CANCEL_LIMIT_HOURS} horas de antelación`);
      }
      return BookingModel.setStatus(tx, bookingId, 'cancelada');
    });
  }
};
