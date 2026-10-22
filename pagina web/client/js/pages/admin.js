import { api } from '../api.js';
import { auth } from '../state.js';
import {
  html, icon, spinner, emptyState, debounce, fmtDate, fmtMoney, CATEGORY_LABELS, LEVEL_LABELS
} from '../utils/dom.js';
import { notify } from '../components/toast.js';
import { confirmDialog, openModal } from '../components/modal.js';
import { openClassForm } from '../components/classForm.js';
import { renderPagination } from '../components/pagination.js';
import { spotsInfo } from '../components/classCard.js';

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: 'chart' },
  { id: 'clases', label: 'Clases', icon: 'dumbbell' },
  { id: 'usuarios', label: 'Usuarios', icon: 'users' }
];

export function render(root, { tab = 'resumen' }) {
  if (!TABS.some((t) => t.id === tab)) tab = 'resumen';
  document.title = `Panel admin · ${TABS.find((t) => t.id === tab).label} — FitBook`;
  root.innerHTML = html`
    <section class="container section admin">
      <header class="page-head">
        <div><h1>Panel de administración</h1><p class="muted">Gestiona clases, reservas y usuarios del gimnasio.</p></div>
        <button class="btn btn-primary" type="button" id="admin-new-class">${icon('plus')} Nueva clase</button>
      </header>
      <nav class="admin-tabs" aria-label="Secciones del panel">
        ${TABS.map((t) => html`<a href="#/admin/${t.id}" class="admin-tab ${t.id === tab ? 'active' : ''}" ${t.id === tab ? html`aria-current="page"` : ''}>${icon(t.icon)} ${t.label}</a>`)}
      </nav>
      <div id="admin-content"></div>
    </section>`;
  const content = root.querySelector('#admin-content');
  const views = { resumen: renderStats, clases: renderClasses, usuarios: renderUsers };
  const reload = () => views[tab](content);
  root.querySelector('#admin-new-class').addEventListener('click', () => openClassForm(null, () => {
    if (tab === 'clases' || tab === 'resumen') reload();
  }));
  reload();
}

/* ---------- Resumen / estadísticas ---------- */
async function renderStats(el) {
  el.innerHTML = spinner('Cargando estadísticas…');
  try {
    const { totals: t, byCategory, topClasses, recent } = await api.stats();
    const maxCat = Math.max(1, ...byCategory.map((c) => c.bookings));
    el.innerHTML = html`
      <div class="kpi-grid">
        ${kpi('users', 'Usuarios', t.users, `${t.admins} administrador${t.admins === 1 ? '' : 'es'}`)}
        ${kpi('dumbbell', 'Clases', t.classes, `${t.upcoming_classes} próximas activas`)}
        ${kpi('ticket', 'Reservas confirmadas', t.confirmed_bookings, `${t.cancelled_bookings} canceladas`)}
        ${kpi('chart', 'Ocupación próxima', `${t.occupancy}%`, `${t.upcoming_booked}/${t.upcoming_capacity} cupos`)}
        ${kpi('cash', 'Ingresos estimados', fmtMoney(t.revenue), 'Reservas confirmadas')}
      </div>
      <div class="admin-grid">
        <section class="glass panel">
          <h2 class="panel-title">Reservas por disciplina</h2>
          <ul class="bar-chart">
            ${byCategory.map((c) => html`<li>
              <span class="bar-label">${CATEGORY_LABELS[c.category]}</span>
              <span class="bar-track"><span class="bar-fill cat-bg-${c.category}" style="width:${Math.round((c.bookings / maxCat) * 100)}%"></span></span>
              <span class="bar-value">${c.bookings}</span></li>`)}
          </ul>
        </section>
        <section class="glass panel">
          <h2 class="panel-title">Clases más demandadas</h2>
          ${topClasses.length ? html`<ol class="top-list">${topClasses.map((c) => html`<li>
              <a href="#/clases/${c.id}">${c.title}</a>
              <span class="chip ${c.booked >= c.capacity ? 'chip-danger' : 'chip-muted'}">${c.booked}/${c.capacity}</span></li>`)}</ol>`
            : html`<p class="muted">Sin clases próximas.</p>`}
        </section>
        <section class="glass panel span-2">
          <h2 class="panel-title">Actividad reciente</h2>
          ${recent.length ? html`<ul class="activity">${recent.map((r) => html`<li>
              <span class="dot ${r.status === 'confirmada' ? 'dot-ok' : 'dot-off'}" aria-hidden="true"></span>
              <span><b>${r.user_name}</b> ${r.status === 'confirmada' ? 'reservó' : 'canceló'} <b>${r.class_title}</b></span>
              <time class="muted small">${fmtDate(r.created_at)}</time></li>`)}</ul>`
            : html`<p class="muted">Sin actividad.</p>`}
        </section>
      </div>`;
  } catch (err) {
    el.innerHTML = emptyState('No se pudieron cargar las estadísticas', err.message);
  }
}

const kpi = (ic, label, value, sub) => html`
  <div class="kpi glass"><span class="kpi-icon">${icon(ic)}</span>
    <div><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div></div>`;

/* ---------- Gestión de clases (CRUD global) ---------- */
function renderClasses(el) {
  const state = { q: '', category: '', level: '', status: '', sort: 'date', order: 'desc', page: 1, scope: 'all', limit: 10 };
  el.innerHTML = html`
    <form class="filters glass compact" role="search" aria-label="Filtrar clases" id="admin-class-filters">
      <div class="field search-field"><label for="ac-q" class="sr-only">Buscar</label>
        <div class="input-icon">${icon('search')}<input id="ac-q" name="q" type="search" placeholder="Buscar clase o instructor…" maxlength="100"></div></div>
      <div class="field"><label for="ac-category">Disciplina</label><select id="ac-category" name="category"><option value="">Todas</option>
        ${Object.entries(CATEGORY_LABELS).map(([v, l]) => html`<option value="${v}">${l}</option>`)}</select></div>
      <div class="field"><label for="ac-level">Nivel</label><select id="ac-level" name="level"><option value="">Todos</option>
        ${Object.entries(LEVEL_LABELS).map(([v, l]) => html`<option value="${v}">${l}</option>`)}</select></div>
      <div class="field"><label for="ac-status">Estado</label><select id="ac-status" name="status">
        <option value="">Todos</option><option value="activa">Activa</option><option value="cancelada">Cancelada</option></select></div>
      <div class="field"><label for="ac-sort">Ordenar</label><select id="ac-sort" name="sort">
        <option value="date">Fecha</option><option value="title">Nombre</option><option value="price">Precio</option><option value="spots">Cupos libres</option></select></div>
      <div class="field"><label for="ac-order">Dirección</label><select id="ac-order" name="order">
        <option value="desc">Descendente</option><option value="asc">Ascendente</option></select></div>
      <div class="field field-clear"><span class="label" aria-hidden="true">&nbsp;</span><button type="reset" class="btn btn-ghost">${icon('x')} Limpiar</button></div>
    </form>
    <div class="table-wrap glass" id="admin-class-table" aria-live="polite"></div>
    <div id="admin-class-pager"></div>`;

  const form = el.querySelector('form');
  const table = el.querySelector('#admin-class-table');
  const pager = el.querySelector('#admin-class-pager');
  let reqId = 0;

  async function load() {
    const id = ++reqId;
    table.innerHTML = spinner();
    try {
      const { items, pagination } = await api.listClasses(state);
      if (id !== reqId) return;
      if (!items.length) {
        table.innerHTML = emptyState('Sin resultados', 'No hay clases que coincidan con los filtros.');
        pager.innerHTML = '';
        return;
      }
      table.innerHTML = html`
        <table class="data-table">
          <caption class="sr-only">Listado de clases</caption>
          <thead><tr><th scope="col">Clase</th><th scope="col">Disciplina</th><th scope="col">Fecha</th>
            <th scope="col">Ocupación</th><th scope="col">Precio</th><th scope="col">Estado</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>${items.map((c) => {
            const { tone } = spotsInfo(c);
            const past = new Date(c.starts_at).getTime() < Date.now();
            return html`<tr>
              <td data-label="Clase"><a href="#/clases/${c.id}" class="strong">${c.title}</a><br><span class="muted small">${c.instructor} · ${LEVEL_LABELS[c.level]}</span></td>
              <td data-label="Disciplina"><span class="chip chip-cat cat-${c.category}">${CATEGORY_LABELS[c.category]}</span></td>
              <td data-label="Fecha">${fmtDate(c.starts_at)}${past ? html`<br><span class="muted small">Finalizada</span>` : ''}</td>
              <td data-label="Ocupación"><span class="tone-${tone} strong">${c.booked}/${c.capacity}</span></td>
              <td data-label="Precio">${fmtMoney(c.price)}</td>
              <td data-label="Estado"><span class="chip ${c.status === 'activa' ? 'chip-success' : 'chip-danger'}">${c.status === 'activa' ? 'Activa' : 'Cancelada'}</span></td>
              <td class="row-actions">
                <button class="icon-btn" type="button" data-attendees="${c.id}" aria-label="Ver inscritos de ${c.title}" title="Inscritos">${icon('users')}</button>
                <button class="icon-btn" type="button" data-edit="${c.id}" aria-label="Editar ${c.title}" title="Editar">${icon('edit')}</button>
                <button class="icon-btn danger" type="button" data-delete="${c.id}" aria-label="Eliminar ${c.title}" title="Eliminar">${icon('trash')}</button>
              </td></tr>`;
          })}</tbody>
        </table>`;
      const byId = (v) => items.find((c) => c.id === Number(v));
      table.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openClassForm(byId(b.dataset.edit), load)));
      table.querySelectorAll('[data-attendees]').forEach((b) => b.addEventListener('click', () => showAttendees(byId(b.dataset.attendees))));
      table.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => {
        const c = byId(b.dataset.delete);
        confirmDialog({
          title: 'Eliminar clase',
          message: `¿Eliminar "${c.title}"? También se eliminarán sus ${c.booked} reservas. Esta acción no se puede deshacer.`,
          confirmText: 'Eliminar',
          onConfirm: async () => {
            try {
              const res = await api.deleteClass(c.id);
              notify.success(res.message);
              if (items.length === 1 && state.page > 1) state.page--;
              load();
            } catch (err) { notify.error(err.message); throw err; }
          }
        });
      }));
      renderPagination(pager, pagination, (p) => { state.page = p; load(); });
    } catch (err) {
      if (id === reqId) table.innerHTML = emptyState('Error al cargar las clases', err.message);
    }
  }

  const update = (e) => { if (e.target.name in state) { state[e.target.name] = e.target.value.trim(); state.page = 1; load(); } };
  form.addEventListener('change', (e) => { if (e.target.name !== 'q') update(e); });
  form.elements.q.addEventListener('input', debounce(update));
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('reset', () => setTimeout(() => {
    Object.assign(state, { q: '', category: '', level: '', status: '', sort: 'date', order: 'desc', page: 1 });
    load();
  }));
  load();
}

async function showAttendees(cls) {
  const { el } = openModal({ title: `Inscritos · ${cls.title}`, body: spinner() });
  const body = el.querySelector('.modal-body');
  try {
    const { items } = await api.attendees(cls.id);
    body.innerHTML = items.length
      ? html`<ul class="attendee-list">${items.map((a) => html`<li>
          <span class="avatar" aria-hidden="true">${a.name.charAt(0).toUpperCase()}</span>
          <span><b>${a.name}</b><br><span class="muted small">${a.email}</span></span>
          <span class="chip ${a.status === 'confirmada' ? 'chip-success' : 'chip-muted'}">${a.status}</span></li>`)}</ul>`
      : emptyState('Sin inscritos', 'Nadie ha reservado esta clase todavía.');
  } catch (err) {
    body.innerHTML = html`<p class="error-inline">${err.message}</p>`;
  }
}

/* ---------- Gestión de usuarios ---------- */
function renderUsers(el) {
  const state = { q: '', role: '', page: 1, limit: 10 };
  el.innerHTML = html`
    <form class="filters glass compact" role="search" aria-label="Filtrar usuarios">
      <div class="field search-field"><label for="au-q" class="sr-only">Buscar usuario</label>
        <div class="input-icon">${icon('search')}<input id="au-q" name="q" type="search" placeholder="Buscar por nombre o correo…" maxlength="100"></div></div>
      <div class="field"><label for="au-role">Rol</label><select id="au-role" name="role">
        <option value="">Todos</option><option value="user">Usuario estándar</option><option value="admin">Administrador</option></select></div>
      <div class="field field-clear"><span class="label" aria-hidden="true">&nbsp;</span><button type="reset" class="btn btn-ghost">${icon('x')} Limpiar</button></div>
    </form>
    <div class="table-wrap glass" id="admin-user-table" aria-live="polite"></div>
    <div id="admin-user-pager"></div>`;
  const form = el.querySelector('form');
  const table = el.querySelector('#admin-user-table');
  const pager = el.querySelector('#admin-user-pager');
  let reqId = 0;

  async function load() {
    const id = ++reqId;
    table.innerHTML = spinner();
    try {
      const { items, pagination } = await api.listUsers(state);
      if (id !== reqId) return;
      if (!items.length) { table.innerHTML = emptyState('Sin resultados', 'No hay usuarios que coincidan.'); pager.innerHTML = ''; return; }
      table.innerHTML = html`
        <table class="data-table">
          <caption class="sr-only">Listado de usuarios</caption>
          <thead><tr><th scope="col">Usuario</th><th scope="col">Teléfono</th><th scope="col">Reservas activas</th>
            <th scope="col">Registro</th><th scope="col">Rol</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>${items.map((u) => {
            const self = u.id === auth.user.id;
            return html`<tr>
              <td data-label="Usuario"><span class="strong">${u.name}</span>${self ? html` <span class="chip chip-muted">Tú</span>` : ''}<br><span class="muted small">${u.email}</span></td>
              <td data-label="Teléfono">${u.phone || '—'}</td>
              <td data-label="Reservas">${u.active_bookings}</td>
              <td data-label="Registro">${new Date(u.created_at).toLocaleDateString('es-MX')}</td>
              <td data-label="Rol">
                <label class="sr-only" for="role-${u.id}">Rol de ${u.name}</label>
                <select id="role-${u.id}" class="select-sm" data-role="${u.id}" ${self ? 'disabled' : ''}>
                  <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuario</option>
                  <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
              </td>
              <td class="row-actions">
                <button class="icon-btn danger" type="button" data-delete="${u.id}" ${self ? 'disabled' : ''} aria-label="Eliminar a ${u.name}" title="Eliminar">${icon('trash')}</button>
              </td></tr>`;
          })}</tbody>
        </table>`;
      const byId = (v) => items.find((u) => u.id === Number(v));
      table.querySelectorAll('[data-role]').forEach((sel) => sel.addEventListener('change', async () => {
        const u = byId(sel.dataset.role);
        sel.disabled = true;
        try {
          const res = await api.changeRole(u.id, sel.value);
          notify.success(`${res.message}: ${u.name} ahora es ${sel.value === 'admin' ? 'administrador' : 'usuario estándar'}`);
          u.role = sel.value;
        } catch (err) {
          notify.error(err.message);
          sel.value = u.role;
        } finally { sel.disabled = false; }
      }));
      table.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => {
        const u = byId(b.dataset.delete);
        confirmDialog({
          title: 'Eliminar usuario',
          message: `¿Eliminar la cuenta de ${u.name} (${u.email})? Se eliminarán también sus reservas.`,
          confirmText: 'Eliminar',
          onConfirm: async () => {
            try {
              const res = await api.deleteUser(u.id);
              notify.success(res.message);
              if (items.length === 1 && state.page > 1) state.page--;
              load();
            } catch (err) { notify.error(err.message); throw err; }
          }
        });
      }));
      renderPagination(pager, pagination, (p) => { state.page = p; load(); });
    } catch (err) {
      if (id === reqId) table.innerHTML = emptyState('Error al cargar usuarios', err.message);
    }
  }
  const update = (e) => { if (e.target.name in state) { state[e.target.name] = e.target.value.trim(); state.page = 1; load(); } };
  form.addEventListener('change', (e) => { if (e.target.name !== 'q') update(e); });
  form.elements.q.addEventListener('input', debounce(update));
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('reset', () => setTimeout(() => { Object.assign(state, { q: '', role: '', page: 1 }); load(); }));
  load();
}
