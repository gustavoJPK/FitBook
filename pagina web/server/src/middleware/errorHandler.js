import { config } from '../config/env.js';

export function notFoundApi(req, res) {
  res.status(404).json({ error: 'Ruta de API no encontrada' });
}

/** Manejador central: nunca expone trazas, SQL ni secretos al cliente. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La solicitud es demasiado grande' });
  }
  // Violaciones de restricciones PostgreSQL
  if (err.code === '23505') return res.status(409).json({ error: 'El registro ya existe' });
  if (err.code === '23503') return res.status(409).json({ error: 'El registro está relacionado con otros datos' });
  if (err.code === '23514' || err.code === '22P02') return res.status(400).json({ error: 'Datos inválidos' });

  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500 && !config.isTest) console.error('[error]', err);
  const body = { error: status >= 500 ? 'Error interno del servidor' : err.message };
  if (err.details && status < 500) body.details = err.details;
  res.status(status).json(body);
}
