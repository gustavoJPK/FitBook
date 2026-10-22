import { html, icon } from '../utils/dom.js';

/** Paginador accesible. Llama a onChange(page). */
export function renderPagination(container, { page, pages, total }, onChange) {
  if (pages <= 1) {
    container.innerHTML = total ? html`<p class="pagination-info">${total} resultado${total === 1 ? '' : 's'}</p>` : '';
    return;
  }
  const nums = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) nums.push(p);
  container.innerHTML = html`
    <nav class="pagination" aria-label="Paginación">
      <button class="icon-btn" type="button" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Página anterior">${icon('chevron-left')}</button>
      ${nums.map((p) => html`<button type="button" class="page-btn ${p === page ? 'active' : ''}" data-page="${p}"
          ${p === page ? html`aria-current="page"` : ''} aria-label="Página ${p}">${p}</button>`)}
      <button class="icon-btn" type="button" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Página siguiente">${icon('chevron-right')}</button>
      <span class="pagination-info">${total} resultados</span>
    </nav>`;
  container.querySelectorAll('[data-page]').forEach((b) =>
    b.addEventListener('click', () => onChange(Number(b.dataset.page))));
}
