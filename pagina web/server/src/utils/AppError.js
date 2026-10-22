/** Error de aplicación con código HTTP y detalles opcionales seguros para el cliente. */
export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
  static badRequest(msg, details) { return new AppError(400, msg, details); }
  static unauthorized(msg = 'No autenticado') { return new AppError(401, msg); }
  static forbidden(msg = 'No tienes permiso para realizar esta acción') { return new AppError(403, msg); }
  static notFound(msg = 'Recurso no encontrado') { return new AppError(404, msg); }
  static conflict(msg, details) { return new AppError(409, msg, details); }
}

/** Envuelve controladores async para delegar errores al middleware central. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
