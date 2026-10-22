import { api } from '../api.js';
import { auth } from '../state.js';
import { html, icon, spinner, emptyState, fmtDateLong, fmtMoney, setLoading, CATEGORY_LABELS, LEVEL_LABELS } from '../utils/dom.js';
import { occupancyBar, spotsInfo } from '../components/classCard.js';
import { notify } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';
import { openClassForm } from '../components/classForm.js';

export function render(root, { id }) {
  root.innerHTML = html`<section class="container section">${spinner('Cargando clase…')}</section>`;
  load();

  async function load() {
    try {
      const [{ item }, bookings] = await Promise.all([
        api.getClass(id),
        auth.isLogged ? api.myBookings('confirmada').then((r) => r.items) : Promise.resolve([])
      ]);
      paint(item, bookings.find((b) => b.class_id === item.id));
    } catch (err) {
      document.title = 'Clase no encontrada — FitBook';
      root.innerHTML = html`<section class="container section">${emptyState(
        err.status === 404 ? 'Clase no encontrada' : 'Error al cargar',
        err.status === 404 ? 'La clase que buscas no existe o ya no está disponible.' : err.message,
        html`<a href="#/clases" class="btn btn-primary">Volver al catálogo</a>`)}</section>`;
    }
  }

  function bookingAction(cls, myBooking) {
    const started = new Date(cls.starts_at).getTime() <= Date.now();
    const { left } = spotsInfo(cls);
    if (!auth.isLogged) {
      return html`<a class="btn btn-primary btn-block" href="#/login?next=/clases/${cls.id}">Inicia sesión para reservar</a>`;
    }
    if (myBooking) {
      return html`<div class="booked-banner">${icon('check')} Ya tienes un lugar reservado</div>
        <button class="btn btn-danger-ghost btn-block" type="button" id="cancel-booking">Cancelar mi reserva</button>`;
    }
    if (cls.status !== 'activa') return html`<button class="btn btn-block" disabled>Clase cancelada</button>`;
    if (started) return html`<button class="btn btn-block" disabled>La clase ya comenzó</button>`;
    if (left === 0) return html`<button class="btn btn-block" disabled>Sin cupos disponibles</button>`;
    return html`<button class="btn btn-primary btn-block btn-lg" type="button" id="book-btn">${icon('ticket')} Reservar mi lugar</button>`;
  }

  function paint(cls, myBooking) {
    document.title = `${cls.title} — FitBook`;
    root.innerHTML = html`
      <section class="container section">
        <nav class="breadcrumbs" aria-label="Ruta de navegación"><a href="#/clases">Clases</a> <span aria-hidden="true">/</span> <span aria-current="page">${cls.title}</span></nav>
        <div class="detail-layout">
          <article class="detail-main glass cat-${cls.category}">
            <div class="class-card-top">
              <span class="chip chip-cat">${CATEGORY_LABELS[cls.category]}</span>
              <span class="chip chip-level lvl-${cls.level}">${LEVEL_LABELS[cls.level]}</span>
              ${cls.status !== 'activa' ? html`<span class="chip chip-danger">Cancelada</span>` : ''}
            </div>
            <h1>${cls.title}</h1>
            <p class="detail-desc">${cls.description}</p>
            <dl class="detail-grid">
              <div><dt>${icon('calendar')} Fecha</dt><dd>${fmtDateLong(cls.starts_at)}</dd></div>
              <div><dt>${icon('clock')} Duración</dt><dd>${cls.duration_min} minutos</dd></div>
              <div><dt>${icon('user')} Instructor</dt><dd>${cls.instructor}</dd></div>
              <div><dt>${icon('users')} Cupo</dt><dd>${cls.booked} / ${cls.capacity} reservados</dd></div>
            </dl>
          </article>
          <aside class="detail-side glass" aria-label="Reserva">
            <p class="muted">Precio por clase</p>
            <p class="detail-price">${cls.price > 0 ? fmtMoney(cls.price) : 'Gratis'}</p>
            ${occupancyBar(cls)}
            <div class="detail-actions">${bookingAction(cls, myBooking)}</div>
            <p class="small muted">Puedes cancelar sin costo hasta 2 horas antes del inicio.</p>
            ${auth.isAdmin ? html`
              <hr>
              <p class="small muted">Acciones de administrador</p>
              <div class="btn-row">
                <button class="btn btn-ghost btn-sm" type="button" id="edit-class">${icon('edit')} Editar</button>
                <button class="btn btn-danger-ghost btn-sm" type="button" id="delete-class">${icon('trash')} Eliminar</button>
              </div>` : ''}
          </aside>
        </div>
      </section>`;

    root.querySelector('#book-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      if (btn.disabled) return;
      setLoading(btn, true);
      try {
        const res = await api.book(cls.id);
        notify.success(`${res.message}: ${cls.title}`);
        await load();
      } catch (err) {
        notify.error(err.message);
        setLoading(btn, false);
        if (err.status === 409) load();
      }
    });

    root.querySelector('#cancel-booking')?.addEventListener('click', () => confirmDialog({
      title: 'Cancelar reserva',
      message: `¿Seguro que deseas cancelar tu reserva para "${cls.title}"? Tu lugar quedará libre para otra persona.`,
      confirmText: 'Sí, cancelar',
      onConfirm: async () => {
        try {
          const res = await api.cancelBooking(myBooking.id);
          notify.success(res.message);
          load();
        } catch (err) {
          notify.error(err.message);
          throw err;
        }
      }
    }));

    root.querySelector('#edit-class')?.addEventListener('click', () => openClassForm(cls, () => load()));
    root.querySelector('#delete-class')?.addEventListener('click', () => confirmDialog({
      title: 'Eliminar clase',
      message: `Se eliminará "${cls.title}" y sus ${cls.booked} reservas asociadas. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          const res = await api.deleteClass(cls.id);
          notify.success(res.message);
          location.hash = '#/clases';
        } catch (err) {
          notify.error(err.message);
          throw err;
        }
      }
    }));
  }
}
