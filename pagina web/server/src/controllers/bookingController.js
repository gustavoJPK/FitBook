import { BookingService } from '../services/bookingService.js';
import { UserService } from '../services/userService.js';
import { StatsModel } from '../models/statsModel.js';
import { validate, parseId } from '../validators/validate.js';
import { roleSchema } from '../validators/schemas.js';

export const BookingController = {
  async mine(req, res) {
    res.json({ items: await BookingService.listMine(req.user.id, req.query.status) });
  },

  async create(req, res) {
    const classId = parseId(req.body?.class_id);
    const item = await BookingService.book(req.user.id, classId);
    res.status(201).json({ item, message: 'Reserva confirmada' });
  },

  async cancel(req, res) {
    const item = await BookingService.cancel(parseId(req.params.id), req.user);
    res.json({ item, message: 'Reserva cancelada' });
  }
};

export const AdminController = {
  async stats(req, res) {
    res.json(await StatsModel.summary());
  },

  async listUsers(req, res) {
    res.json(await UserService.list(req.query));
  },

  async changeRole(req, res) {
    const { role } = validate(roleSchema, req.body);
    const user = await UserService.changeRole(parseId(req.params.id), role, req.user);
    res.json({ user, message: 'Rol actualizado' });
  },

  async removeUser(req, res) {
    await UserService.remove(parseId(req.params.id), req.user);
    res.json({ message: 'Usuario eliminado' });
  }
};
