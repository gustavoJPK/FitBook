import { config } from '../config/env.js';
import { AuthService } from '../services/authService.js';
import { UserModel } from '../models/userModel.js';
import { AppError } from '../utils/AppError.js';

/** Lee el JWT de la cookie httpOnly y carga el usuario actual desde la BD (rol siempre actualizado). */
async function resolveUser(req) {
  const token = req.cookies?.[config.cookieName];
  if (!token) return null;
  try {
    const payload = AuthService.verifyToken(token);
    return await UserModel.findById(Number(payload.sub));
  } catch {
    return null;
  }
}

export async function authenticate(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) throw AppError.unauthorized('Debes iniciar sesión');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    req.user = await resolveUser(req);
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(AppError.unauthorized('Debes iniciar sesión'));
  if (!roles.includes(req.user.role)) return next(AppError.forbidden('Acceso restringido a administradores'));
  next();
};

/**
 * Protección CSRF complementaria a SameSite: las peticiones que modifican datos deben
 * incluir la cabecera X-Requested-With, que un formulario de otro sitio no puede enviar.
 */
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'fetch') return next(AppError.forbidden('Solicitud no permitida'));
  next();
}
