import { AppError } from '../utils/AppError.js';

/**
 * Validador declarativo minimalista. Cada regla describe un campo; devuelve
 * un objeto limpio (solo campos permitidos, recortados y tipados) o lanza 400.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Elimina caracteres de control y etiquetas HTML básicas (defensa en profundidad; el frontend además escapa).
const stripTags = (s) => s.replace(/[\u0000-\u001F\u007F]/g, '').replace(/<[^>]*>/g, '');

export function validate(schema, input = {}, { partial = false } = {}) {
  const errors = {};
  const out = {};
  for (const [field, rule] of Object.entries(schema)) {
    let value = input[field];
    const missing = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
    if (missing) {
      if (rule.required && !partial) errors[field] = rule.label ? `${rule.label} es obligatorio` : 'Campo obligatorio';
      else if (!partial && rule.default !== undefined) out[field] = rule.default;
      else if (!partial && !rule.required) out[field] = null;
      continue;
    }
    switch (rule.type) {
      case 'string': {
        value = stripTags(String(value)).trim();
        if (rule.min && value.length < rule.min) errors[field] = `Debe tener al menos ${rule.min} caracteres`;
        else if (rule.max && value.length > rule.max) errors[field] = `Debe tener como máximo ${rule.max} caracteres`;
        else if (rule.pattern && !rule.pattern.test(value)) errors[field] = rule.patternMsg || 'Formato inválido';
        break;
      }
      case 'email': {
        value = String(value).trim().toLowerCase();
        if (value.length > 120 || !EMAIL_RE.test(value)) errors[field] = 'Correo electrónico inválido';
        break;
      }
      case 'password': {
        value = String(value);
        if (value.length < 8 || value.length > 72) errors[field] = 'La contraseña debe tener entre 8 y 72 caracteres';
        else if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) errors[field] = 'La contraseña debe incluir letras y números';
        break;
      }
      case 'int':
      case 'number': {
        const n = Number(value);
        if (!Number.isFinite(n) || (rule.type === 'int' && !Number.isInteger(n))) { errors[field] = 'Debe ser un número válido'; break; }
        if (rule.min !== undefined && n < rule.min) errors[field] = `Debe ser mayor o igual a ${rule.min}`;
        else if (rule.max !== undefined && n > rule.max) errors[field] = `Debe ser menor o igual a ${rule.max}`;
        value = n;
        break;
      }
      case 'enum': {
        value = String(value).trim().toLowerCase();
        if (!rule.values.includes(value)) errors[field] = `Valor no permitido`;
        break;
      }
      case 'date': {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) { errors[field] = 'Fecha inválida'; break; }
        if (rule.future && d.getTime() < Date.now()) errors[field] = 'La fecha debe ser futura';
        value = d.toISOString();
        break;
      }
      default:
        break;
    }
    if (!errors[field]) out[field] = value;
  }
  if (Object.keys(errors).length) throw AppError.badRequest('Datos inválidos', errors);
  return out;
}

export function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw AppError.badRequest('Identificador inválido');
  return id;
}
