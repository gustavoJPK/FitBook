import { $$ } from '../utils/dom.js';

/**
 * Helpers de formularios: validación en cliente con mensajes por campo y
 * presentación de errores devueltos por el servidor (details).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const rules = {
  required: (label) => (v) => (String(v ?? '').trim() ? null : `${label} es obligatorio`),
  email: () => (v) => (!v || EMAIL_RE.test(String(v).trim()) ? null : 'Introduce un correo válido (ej. nombre@dominio.com)'),
  min: (n) => (v) => (!v || String(v).trim().length >= n ? null : `Debe tener al menos ${n} caracteres`),
  max: (n) => (v) => (!v || String(v).trim().length <= n ? null : `Debe tener como máximo ${n} caracteres`),
  password: () => (v) => {
    if (!v) return null;
    if (v.length < 8) return 'Mínimo 8 caracteres';
    if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Debe incluir letras y números';
    return null;
  },
  range: (min, max) => (v) => {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? null : `Debe estar entre ${min} y ${max}`;
  },
  future: () => (v) => (!v || new Date(v).getTime() > Date.now() ? null : 'La fecha debe ser futura'),
  phone: () => (v) => (!v || /^[0-9+\-\s()]{7,20}$/.test(v) ? null : 'Teléfono inválido'),
  match: (otherName, msg) => (v, form) => (v === form.elements[otherName].value ? null : msg)
};

export function setFieldError(form, name, message) {
  const input = form.elements[name];
  if (!input) return;
  const field = input.closest('.field');
  const errEl = field?.querySelector('.field-error');
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  field?.classList.toggle('has-error', !!message);
  if (errEl) errEl.textContent = message || '';
}

export function clearErrors(form) {
  $$('.field', form).forEach((f) => f.classList.remove('has-error'));
  $$('.field-error', form).forEach((e) => { e.textContent = ''; });
  $$('[aria-invalid]', form).forEach((i) => i.setAttribute('aria-invalid', 'false'));
}

/** Valida y devuelve true/false. Enfoca el primer campo con error. */
export function validateForm(form, schema) {
  clearErrors(form);
  let firstInvalid = null;
  for (const [name, validators] of Object.entries(schema)) {
    const value = form.elements[name]?.value ?? '';
    for (const fn of validators) {
      const msg = fn(value, form);
      if (msg) {
        setFieldError(form, name, msg);
        firstInvalid ??= form.elements[name];
        break;
      }
    }
  }
  firstInvalid?.focus();
  return !firstInvalid;
}

/** Validación en vivo al salir del campo. */
export function liveValidate(form, schema) {
  for (const [name, validators] of Object.entries(schema)) {
    const input = form.elements[name];
    if (!input) continue;
    input.addEventListener('blur', () => {
      const msg = validators.map((fn) => fn(input.value, form)).find(Boolean);
      setFieldError(form, name, msg || null);
    });
  }
}

export function showServerErrors(form, err) {
  if (err?.details && typeof err.details === 'object') {
    Object.entries(err.details).forEach(([k, m]) => setFieldError(form, k, m));
    const first = Object.keys(err.details)[0];
    form.elements[first]?.focus();
  }
}

export const formData = (form) => Object.fromEntries(new FormData(form).entries());
