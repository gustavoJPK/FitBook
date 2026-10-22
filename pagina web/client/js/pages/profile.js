import { api } from '../api.js';
import { auth } from '../state.js';
import { html, icon, setLoading, fmtDateLong } from '../utils/dom.js';
import { notify } from '../components/toast.js';
import { rules, validateForm, liveValidate, showServerErrors, formData } from '../components/form.js';

export function render(root) {
  document.title = 'Mi perfil — FitBook';
  const u = auth.user;
  root.innerHTML = html`
    <section class="container section narrow">
      <header class="page-head"><div><h1>Mi perfil</h1><p class="muted">Actualiza tus datos personales.</p></div></header>
      <div class="glass profile-card">
        <div class="profile-head">
          <span class="avatar avatar-lg" aria-hidden="true">${u.name.charAt(0).toUpperCase()}</span>
          <div>
            <p class="profile-name">${u.name}</p>
            <p class="muted small">${u.email} · ${u.role === 'admin' ? 'Administrador' : 'Usuario estándar'}</p>
            <p class="muted small">Miembro desde ${fmtDateLong(u.created_at).split(',').slice(0, 2).join(',')}</p>
          </div>
        </div>
        <form id="profile-form" class="form-stack" novalidate>
          <div class="field"><label for="p-name">Nombre</label>
            <input id="p-name" name="name" value="${u.name}" maxlength="80" required aria-describedby="p-name-err">
            <p class="field-error" id="p-name-err" aria-live="polite"></p></div>
          <div class="field"><label for="p-email">Correo electrónico</label>
            <input id="p-email" value="${u.email}" disabled aria-describedby="p-email-hint">
            <small class="field-hint" id="p-email-hint">El correo no puede modificarse.</small></div>
          <div class="field"><label for="p-phone">Teléfono</label>
            <input id="p-phone" name="phone" type="tel" value="${u.phone || ''}" maxlength="20" aria-describedby="p-phone-err">
            <p class="field-error" id="p-phone-err" aria-live="polite"></p></div>
          <button class="btn btn-primary" type="submit">${icon('check')} Guardar cambios</button>
        </form>
      </div>
    </section>`;

  const form = root.querySelector('form');
  const schema = { name: [rules.required('El nombre'), rules.min(2), rules.max(80)], phone: [rules.phone()] };
  liveValidate(form, schema);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form, schema)) return notify.error('Revisa los campos marcados');
    const btn = form.querySelector('[type=submit]');
    if (btn.disabled) return;
    setLoading(btn, true);
    try {
      const res = await api.updateProfile(formData(form));
      auth.set(res.user);
      notify.success(res.message);
      render(root);
    } catch (err) {
      showServerErrors(form, err);
      notify.error(err.message);
      setLoading(btn, false);
    }
  });
}
