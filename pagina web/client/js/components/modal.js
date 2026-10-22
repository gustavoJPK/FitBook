import { html, icon, setLoading } from '../utils/dom.js';

/**
 * Modal accesible: atrapa el foco, se cierra con Escape y restaura el foco al cerrar.
 * Devuelve { el, close }.
 */
export function openModal({ title, body, wide = false, onClose }) {
  const previous = document.activeElement;
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = html`
    <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-header">
        <h2 id="modal-title">${title}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button>
      </header>
      <div class="modal-body">${body}</div>
    </div>`;
  root.appendChild(overlay);
  document.body.classList.add('no-scroll');

  const modal = overlay.querySelector('.modal');
  const focusables = () => [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.disabled);

  function close(result) {
    overlay.classList.add('leaving');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      overlay.remove();
      if (!root.children.length) document.body.classList.remove('no-scroll');
      previous?.focus?.();
    }, 180);
    onClose?.(result);
  }
  function onKey(e) {
    if (e.key === 'Escape') close(false);
    if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(false); });
  modal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => close(false)));
  setTimeout(() => (modal.querySelector('[autofocus]') || focusables()[1] || focusables()[0])?.focus(), 30);
  return { el: modal, close };
}

/**
 * Diálogo de confirmación. `onConfirm` es async: el botón muestra carga y el
 * modal solo se cierra si la operación tiene éxito.
 */
export function confirmDialog({ title, message, confirmText = 'Confirmar', danger = true, onConfirm }) {
  const { el, close } = openModal({
    title,
    body: html`
      <p class="confirm-text">${message}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm autofocus>${confirmText}</button>
      </div>`
  });
  const btn = el.querySelector('[data-confirm]');
  btn.addEventListener('click', async () => {
    setLoading(btn, true);
    try {
      await onConfirm();
      close(true);
    } catch {
      setLoading(btn, false);
    }
  });
}
