/** Utilidades de DOM y formato. Toda interpolación en `html` se escapa (prevención XSS). */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export const escapeHtml = (v) => String(v ?? '').replace(/[&<>"'`]/g, (c) => ESC[c]);

class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}
/** Marca HTML como confiable (solo para fragmentos generados por `html`). */
export const raw = (v) => new SafeHtml(v);

const render = (v) => {
  if (v instanceof SafeHtml) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  if (v === false || v === null || v === undefined) return '';
  return escapeHtml(v);
};

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += render(v) + strings[i + 1]; });
  return new SafeHtml(out);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const icon = (name, cls = '') =>
  html`<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

const dateFmt = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const dateLongFmt = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const moneyFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export const fmtDate = (d) => dateFmt.format(new Date(d));
export const fmtDateLong = (d) => dateLongFmt.format(new Date(d));
export const fmtMoney = (n) => moneyFmt.format(Number(n) || 0);

/** Convierte ISO -> valor para <input type="datetime-local"> en hora local. */
export function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const CATEGORY_LABELS = {
  yoga: 'Yoga', spinning: 'Spinning', crossfit: 'CrossFit', pilates: 'Pilates',
  funcional: 'Funcional', boxeo: 'Boxeo', baile: 'Baile'
};
export const LEVEL_LABELS = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };

export function debounce(fn, ms = 350) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Pone un botón en estado de carga y lo deshabilita (evita envíos duplicados). */
export function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('is-loading', loading);
  btn.setAttribute('aria-busy', String(loading));
}

export const spinner = (label = 'Cargando...') =>
  html`<div class="loader" role="status"><span class="spinner"></span><span>${label}</span></div>`;

export const emptyState = (title, text, action = '') =>
  html`<div class="empty-state">${icon('inbox', 'empty-icon')}<h3>${title}</h3><p>${text}</p>${action}</div>`;
