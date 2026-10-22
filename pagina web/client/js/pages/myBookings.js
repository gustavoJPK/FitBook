import { api } from '../api.js';
import { html, icon, spinner, emptyState, fmtDate, fmtMoney, CATEGORY_LABELS } from '../utils/dom.js';
import { notify } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';

export function render(root) {
  document.title = 'Mis reservas — FitBook';
  let tab = 'upcoming';

  root.innerHTML = html`
    <section class="container section">
      <header class="page-head">
        <div><h1>Mis reservas</h1><p class="muted">Gestiona tus clases reservadas.</p></div>
        <a href="#/clases" class="btn btn-primary">${icon('plus')} Reservar otra clase</a>
      </header>
      <div class="stats-row" id="my-stats"></div>
      <div class="tabs" role="tablist" aria-label="Filtrar reservas">
        <button role="tab" class="tab active" data-tab="upcoming" aria-selected="true" id="tab-upcoming">Próximas</button>
        <button role="tab" class="tab" data-tab="past" aria-selected="false" id="tab-past">Pasadas</button>
        <button role="tab" class="tab" data-tab="cancelled" aria-selected="false" id="tab-cancelled">Canceladas</button>
      </div>
      <div id="bookings-list" role="tabpanel" aria-live="polite">${spinner()}</div>
    </section>`;

  const list = root.querySelector('#bookings-list');
  const statsEl = root.querySelector('#my-stats');
  let all = [];

  root.querySelectorAll('[data-tab]').forEach((t) => t.addEventListener('click', () => {
    tab = t.dataset.tab;
    root.querySelectorAll('[data-tab]').forEach((x) => {
      x.classList.toggle('active', x === t);
      x.setAttribute('aria-selected', String(x === t));
    });
    paint();
  }));

  async function load() {
    list.innerHTML = spinner();
    try {
      all = (await api.myBookings()).items;
      paint();
    } catch (err) {
      list.innerHTML = emptyState('Error al cargar', err.message, html`<button class="btn btn-primary" data-retry type="button">Reintentar</button>`);
      list.querySelector('[data-retry]').addEventListener('click', load);
    }
  }

  function paint() {
    const now = Date.now();
    const confirmed = all.filter((b) => b.status === 'confirmada');
    const upcoming = confirmed.filter((b) => new Date(b.starts_at).getTime() > now);
    const past = confirmed.filter((b) => new Date(b.starts_at).getTime() <= now);
    const cancelled = all.filter((b) => b.status === 'cancelada');
    const spent = confirmed.reduce((s, b) => s + b.price, 0);
    statsEl.innerHTML = html`
      <div class="stat-card glass"><span class="stat-label">Próximas</span><strong class="stat-value">${upcoming.length}</strong></div>
      <div class="stat-card glass"><span class="stat-label">Asistidas</span><strong class="stat-value">${past.length}</strong></div>
      <div class="stat-card glass"><span class="stat-label">Minutos reservados</span><strong class="stat-value">${confirmed.reduce((s, b) => s + b.duration_min, 0)}</strong></div>
      <div class="stat-card glass"><span class="stat-label">Inversión total</span><strong class="stat-value">${fmtMoney(spent)}</strong></div>`;

    const items = { upcoming, past, cancelled }[tab];
    if (!items.length) {
      list.innerHTML = emptyState(
        tab === 'upcoming' ? 'No tienes reservas próximas' : tab === 'past' ? 'Aún no tienes clases pasadas' : 'No tienes reservas canceladas',
        tab === 'upcoming' ? 'Explora el catálogo y reserva tu primera clase.' : 'Aquí aparecerá tu historial.',
        tab === 'upcoming' ? html`<a href="#/clases" class="btn btn-primary">Ver clases</a>` : '');
      return;
    }
    list.innerHTML = html`<ul class="booking-list">${items.map((b) => {
      const hoursLeft = (new Date(b.starts_at).getTime() - now) / 3600000;
      const canCancel = b.status === 'confirmada' && hoursLeft >= 2;
      return html`
        <li class="booking-item glass cat-${b.category}">
          <div class="booking-date">
            <span class="booking-day">${new Date(b.starts_at).getDate()}</span>
            <span class="booking-month">${new Date(b.starts_at).toLocaleDateString('es-MX', { month: 'short' })}</span>
          </div>
          <div class="booking-info">
            <h3><a href="#/clases/${b.class_id}">${b.title}</a></h3>
            <p class="muted small">${CATEGORY_LABELS[b.category]} · ${fmtDate(b.starts_at)} · ${b.duration_min} min · ${b.instructor}</p>
            ${b.class_status === 'cancelada' ? html`<span class="chip chip-danger">Clase cancelada por el gimnasio</span>` : ''}
          </div>
          <div class="booking-actions">
            <span class="chip ${b.status === 'confirmada' ? 'chip-success' : 'chip-muted'}">${b.status === 'confirmada' ? 'Confirmada' : 'Cancelada'}</span>
            ${b.status === 'confirmada' && hoursLeft > 0
              ? html`<button class="btn btn-danger-ghost btn-sm" type="button" data-cancel="${b.id}" ${canCancel ? '' : 'disabled'}
                  title="${canCancel ? 'Cancelar reserva' : 'Solo se puede cancelar con 2 h de antelación'}">Cancelar</button>`
              : ''}
          </div>
        </li>`;
    })}</ul>`;

    list.querySelectorAll('[data-cancel]').forEach((btn) => btn.addEventListener('click', () => {
      const b = all.find((x) => x.id === Number(btn.dataset.cancel));
      confirmDialog({
        title: 'Cancelar reserva',
        message: `¿Cancelar tu reserva para "${b.title}" del ${fmtDate(b.starts_at)}?`,
        confirmText: 'Sí, cancelar',
        onConfirm: async () => {
          try {
            const res = await api.cancelBooking(b.id);
            notify.success(res.message);
            await load();
          } catch (err) {
            notify.error(err.message);
            throw err;
          }
        }
      });
    }));
  }

  load();
}
