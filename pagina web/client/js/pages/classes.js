import { api } from '../api.js';
import { html, icon, debounce, emptyState, CATEGORY_LABELS, LEVEL_LABELS } from '../utils/dom.js';
import { classCard, skeletonCards } from '../components/classCard.js';
import { renderPagination } from '../components/pagination.js';

const DEFAULTS = { q: '', category: '', level: '', from: '', to: '', sort: 'date', order: 'asc', page: 1 };
const SORTS = { date: 'Fecha', price: 'Precio', title: 'Nombre', spots: 'Cupos disponibles' };

const opts = (map, sel, all) =>
  html`<option value="">${all}</option>${Object.entries(map).map(([v, l]) => html`<option value="${v}" ${v === sel ? 'selected' : ''}>${l}</option>`)}`;

export function render(root) {
  document.title = 'Clases — FitBook';
  const urlParams = new URLSearchParams(location.hash.split('?')[1] || '');
  const state = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS)) if (urlParams.has(k)) state[k] = urlParams.get(k);
  state.page = Number(state.page) || 1;

  root.innerHTML = html`
    <section class="container section">
      <header class="page-head">
        <div>
          <h1>Clases disponibles</h1>
          <p class="muted">Encuentra la clase ideal y reserva tu lugar.</p>
        </div>
      </header>

      <form class="filters glass" id="filters" role="search" aria-label="Buscar y filtrar clases">
        <div class="field search-field">
          <label for="f-q" class="sr-only">Buscar</label>
          <div class="input-icon">${icon('search')}
            <input id="f-q" name="q" type="search" placeholder="Buscar por clase, instructor o descripción…" value="${state.q}" maxlength="100">
          </div>
        </div>
        <div class="field"><label for="f-category">Disciplina</label>
          <select id="f-category" name="category">${opts(CATEGORY_LABELS, state.category, 'Todas')}</select></div>
        <div class="field"><label for="f-level">Nivel</label>
          <select id="f-level" name="level">${opts(LEVEL_LABELS, state.level, 'Todos')}</select></div>
        <div class="field"><label for="f-from">Desde</label>
          <input id="f-from" name="from" type="date" value="${state.from}"></div>
        <div class="field"><label for="f-to">Hasta</label>
          <input id="f-to" name="to" type="date" value="${state.to}"></div>
        <div class="field"><label for="f-sort">Ordenar por</label>
          <select id="f-sort" name="sort">${Object.entries(SORTS).map(([v, l]) => html`<option value="${v}" ${v === state.sort ? 'selected' : ''}>${l}</option>`)}</select></div>
        <div class="field field-order">
          <span class="label">Orden</span>
          <button type="button" class="btn btn-ghost btn-order" id="f-order" aria-label="Cambiar orden"></button>
        </div>
        <div class="field field-clear">
          <span class="label" aria-hidden="true">&nbsp;</span>
          <button type="reset" class="btn btn-ghost" id="f-clear">${icon('x')} Limpiar</button>
        </div>
      </form>

      <p class="results-summary" id="results-summary" aria-live="polite"></p>
      <div class="cards-grid" id="classes-grid" aria-busy="true">${skeletonCards(6)}</div>
      <div id="classes-pagination"></div>
    </section>`;

  const form = root.querySelector('#filters');
  const grid = root.querySelector('#classes-grid');
  const summary = root.querySelector('#results-summary');
  const pager = root.querySelector('#classes-pagination');
  const orderBtn = root.querySelector('#f-order');
  let requestId = 0;

  const paintOrder = () => {
    orderBtn.innerHTML = html`${icon(state.order === 'asc' ? 'sort-asc' : 'sort-desc')} ${state.order === 'asc' ? 'Ascendente' : 'Descendente'}`;
    orderBtn.setAttribute('aria-label', `Orden ${state.order === 'asc' ? 'ascendente' : 'descendente'}, pulsa para cambiar`);
  };

  function syncUrl() {
    const qs = new URLSearchParams(Object.entries(state).filter(([k, v]) => v !== '' && v !== DEFAULTS[k])).toString();
    history.replaceState(null, '', `#/clases${qs ? `?${qs}` : ''}`);
  }

  const activeFilterCount = () => ['q', 'category', 'level', 'from', 'to'].filter((k) => state[k]).length;

  async function load() {
    const id = ++requestId;
    syncUrl();
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = skeletonCards(6);
    try {
      const { items, pagination } = await api.listClasses({ ...state, limit: 9 });
      if (id !== requestId) return; // respuesta obsoleta
      const n = activeFilterCount();
      summary.textContent = `${pagination.total} clase${pagination.total === 1 ? '' : 's'} encontrada${pagination.total === 1 ? '' : 's'}${n ? ` · ${n} filtro${n > 1 ? 's' : ''} activo${n > 1 ? 's' : ''}` : ''}`;
      grid.innerHTML = items.length
        ? html`${items.map(classCard)}`
        : emptyState('Sin coincidencias', 'No encontramos clases con esos criterios. Prueba con otros filtros.',
          html`<button class="btn btn-primary" type="button" data-clear>Limpiar filtros</button>`);
      grid.querySelector('[data-clear]')?.addEventListener('click', clearAll);
      renderPagination(pager, pagination, (p) => { state.page = p; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    } catch (err) {
      if (id !== requestId) return;
      summary.textContent = '';
      pager.innerHTML = '';
      grid.innerHTML = emptyState('No se pudieron cargar las clases', err.message,
        html`<button class="btn btn-primary" type="button" data-retry>Reintentar</button>`);
      grid.querySelector('[data-retry]').addEventListener('click', load);
    } finally {
      if (id === requestId) grid.setAttribute('aria-busy', 'false');
    }
  }

  function clearAll() {
    Object.assign(state, DEFAULTS);
    form.reset();
    form.elements.q.value = '';
    ['category', 'level', 'from', 'to'].forEach((k) => { form.elements[k].value = ''; });
    form.elements.sort.value = 'date';
    paintOrder();
    load();
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    if (!(name in state)) return;
    state[name] = value.trim();
    state.page = 1;
    load();
  };
  form.addEventListener('change', (e) => { if (e.target.name !== 'q') onChange(e); });
  form.elements.q.addEventListener('input', debounce(onChange, 350));
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('reset', (e) => { e.preventDefault(); clearAll(); });
  orderBtn.addEventListener('click', () => {
    state.order = state.order === 'asc' ? 'desc' : 'asc';
    state.page = 1;
    paintOrder();
    load();
  });

  paintOrder();
  load();
}
