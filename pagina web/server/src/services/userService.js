import { UserModel } from '../models/userModel.js';
import { AppError } from '../utils/AppError.js';
import { ROLES } from '../validators/schemas.js';

export const UserService = {
  async list(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
    const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
    const role = ROLES.includes(query.role) ? query.role : null;
    const { items, total } = await UserModel.list({ q, role, page, limit });
    return { items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
  },

  async changeRole(targetId, role, actor) {
    if (targetId === actor.id) throw AppError.badRequest('No puedes cambiar tu propio rol');
    const target = await UserModel.findById(targetId);
    if (!target) throw AppError.notFound('El usuario no existe');
    if (target.role === 'admin' && role !== 'admin' && (await UserModel.countAdmins()) <= 1) {
      throw AppError.badRequest('Debe existir al menos un administrador');
    }
    return UserModel.updateRole(targetId, role);
  },

  async remove(targetId, actor) {
    if (targetId === actor.id) throw AppError.badRequest('No puedes eliminar tu propia cuenta desde el panel');
    const target = await UserModel.findById(targetId);
    if (!target) throw AppError.notFound('El usuario no existe');
    if (target.role === 'admin' && (await UserModel.countAdmins()) <= 1) {
      throw AppError.badRequest('Debe existir al menos un administrador');
    }
    await UserModel.remove(targetId);
  },

  async updateProfile(userId, data) {
    const user = await UserModel.updateProfile(userId, data);
    if (!user) throw AppError.notFound('El usuario no existe');
    return user;
  }
};
