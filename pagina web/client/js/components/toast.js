import { html, icon } from '../utils/dom.js';

const ICONS = { success: 'check', error: 'alert', info: 'info' };

/** Notificaciones tipo toast, anunciadas a lectores de pantalla mediante aria-live. */
export function toast(message, type = 'info', timeout = 4000) {
  const region = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = html`${icon(ICONS[type] || 'info')}<span>${message}</span>
    <button class="toast-close" type="button" aria-label="Cerrar notificación">${icon('x')}</button>`;
  const close = () => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 250);
  };
  el.querySelector('.toast-close').addEventListener('click', close);
  region.appendChild(el);
  setTimeout(close, timeout);
}

export const notify = {
  success: (m) => toast(m, 'success'),
  error: (m) => toast(m, 'error', 6000),
  info: (m) => toast(m, 'info')
};
