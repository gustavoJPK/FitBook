import { api } from '../api.js';
import { html, setLoading, toLocalInput, CATEGORY_LABELS, LEVEL_LABELS } from '../utils/dom.js';
import { openModal } from './modal.js';
import { notify } from './toast.js';
import { rules, validateForm, liveValidate, showServerErrors, formData } from './form.js';

const schema = {
  title: [rules.required('El título'), rules.min(3), rules.max(100)],
  description: [rules.required('La descripción'), rules.min(10), rules.max(1000)],
  category: [rules.required('La categoría')],
  level: [rules.required('El nivel')],
  instructor: [rules.required('El instructor'), rules.min(2), rules.max(80)],
  starts_at: [rules.required('La fecha y hora')],
  duration_min: [rules.required('La duración'), rules.range(15, 240)],
  capacity: [rules.required('El cupo'), rules.range(1, 100)],
  price: [rules.required('El precio'), rules.range(0, 99999)]
};

const field = (name, label, control, hint = '') => html`
  <div class="field">
    <label for="cf-${name}">${label}</label>
    ${control}
    ${hint ? html`<small class="field-hint">${hint}</small>` : ''}
    <p class="field-error" id="cf-${name}-err" aria-live="polite"></p>
  </div>`;

const options = (map, selected) =>
  Object.entries(map).map(([v, l]) => html`<option value="${v}" ${v === selected ? 'selected' : ''}>${l}</option>`);

/** Modal de creación/edición de clase. onSaved(item) se invoca tras guardar en el servidor. */
export function openClassForm(existing, onSaved) {
  const c = existing || {};
  const isEdit = !!existing;
  const { el, close } = openModal({
    title: isEdit ? 'Editar clase' : 'Nueva clase',
    wide: true,
    body: html`
      <form class="form-grid" novalidate>
        ${field('title', 'Título', html`<input id="cf-title" name="title" maxlength="100" value="${c.title || ''}" aria-describedby="cf-title-err" autofocus required>`)}
        ${field('instructor', 'Instructor', html`<input id="cf-instructor" name="instructor" maxlength="80" value="${c.instructor || ''}" aria-describedby="cf-instructor-err" required>`)}
        ${field('category', 'Categoría', html`<select id="cf-category" name="category" required><option value="">Selecciona…</option>${options(CATEGORY_LABELS, c.category)}</select>`)}
        ${field('level', 'Nivel', html`<select id="cf-level" name="level" required><option value="">Selecciona…</option>${options(LEVEL_LABELS, c.level)}</select>`)}
        ${field('starts_at', 'Fecha y hora', html`<input id="cf-starts_at" type="datetime-local" name="starts_at" value="${c.starts_at ? toLocalInput(c.starts_at) : ''}" required>`)}
        ${field('duration_min', 'Duración (min)', html`<input id="cf-duration_min" type="number" name="duration_min" min="15" max="240" step="5" value="${c.duration_min ?? 60}" required>`)}
        ${field('capacity', 'Cupo máximo', html`<input id="cf-capacity" type="number" name="capacity" min="1" max="100" value="${c.capacity ?? 15}" required>`,
          isEdit ? `Reservas confirmadas: ${c.booked}` : '')}
        ${field('price', 'Precio (MXN)', html`<input id="cf-price" type="number" name="price" min="0" step="0.01" value="${c.price ?? 0}" required>`)}
        ${isEdit ? field('status', 'Estado', html`<select id="cf-status" name="status">${options({ activa: 'Activa', cancelada: 'Cancelada' }, c.status)}</select>`) : ''}
        <div class="field span-2">
          <label for="cf-description">Descripción</label>
          <textarea id="cf-description" name="description" rows="4" maxlength="1000" required>${c.description || ''}</textarea>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="modal-actions span-2">
          <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar cambios' : 'Crear clase'}</button>
        </div>
      </form>`
  });

  const form = el.querySelector('form');
  el.querySelector('[data-close]').addEventListener('click', () => close(false));
  const fullSchema = isEdit ? schema : { ...schema, starts_at: [...schema.starts_at, rules.future()] };
  liveValidate(form, fullSchema);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form, fullSchema)) {
      notify.error('Revisa los campos marcados');
      return;
    }
    const btn = form.querySelector('[type=submit]');
    if (btn.disabled) return;
    const data = formData(form);
    data.starts_at = new Date(data.starts_at).toISOString();
    setLoading(btn, true);
    try {
      const res = isEdit ? await api.updateClass(c.id, data) : await api.createClass(data);
      notify.success(res.message);
      close(true);
      onSaved?.(res.item);
    } catch (err) {
      showServerErrors(form, err);
      notify.error(err.message);
      setLoading(btn, false);
    }
  });
}
