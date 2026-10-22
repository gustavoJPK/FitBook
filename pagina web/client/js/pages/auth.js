import { api } from '../api.js';
import { auth } from '../state.js';
import { html, icon, setLoading } from '../utils/dom.js';
import { notify } from '../components/toast.js';
import { rules, validateForm, liveValidate, showServerErrors, formData } from '../components/form.js';

const field = (id, label, input, hint = '') => html`
  <div class="field">
    <label for="${id}">${label}</label>
    ${input}
    ${hint ? html`<small class="field-hint" id="${id}-hint">${hint}</small>` : ''}
    <p class="field-error" id="${id}-err" aria-live="polite"></p>
  </div>`;

function shell(title, subtitle, formHtml, footer) {
  return html`
    <section class="auth-page container">
      <div class="auth-card glass">
        <a href="#/" class="brand brand-center"><span class="brand-mark">${icon('bolt')}</span><span>Fit<b>Book</b></span></a>
        <h1>${title}</h1>
        <p class="muted">${subtitle}</p>
        ${formHtml}
        <p class="auth-footer">${footer}</p>
      </div>
    </section>`;
}

function redirectAfterAuth() {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  const next = params.get('next');
  // Solo rutas internas para evitar redirecciones abiertas
  location.hash = next && next.startsWith('/') && !next.startsWith('//') ? `#${next}` : auth.isAdmin ? '#/admin' : '#/clases';
}

function passwordToggle(form) {
  form.querySelectorAll('[data-toggle-pass]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = form.elements[btn.dataset.togglePass];
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  });
}

const passInput = (id, name, autocomplete) => html`
  <div class="input-group">
    <input id="${id}" name="${name}" type="password" autocomplete="${autocomplete}" required maxlength="72" aria-describedby="${id}-err ${id}-hint">
    <button type="button" class="icon-btn input-addon" data-toggle-pass="${name}" aria-label="Mostrar contraseña" aria-pressed="false">${icon('eye')}</button>
  </div>`;

async function submitHandler(form, schema, action) {
  if (!validateForm(form, schema)) {
    notify.error('Completa correctamente los campos marcados');
    return;
  }
  const btn = form.querySelector('[type=submit]');
  if (btn.disabled) return;
  setLoading(btn, true);
  try {
    const res = await action(formData(form));
    auth.set(res.user);
    notify.success(res.message);
    redirectAfterAuth();
  } catch (err) {
    showServerErrors(form, err);
    const alert = form.querySelector('.form-alert');
    alert.textContent = err.message;
    alert.hidden = false;
    notify.error(err.message);
    setLoading(btn, false);
  }
}

export function renderLogin(root) {
  document.title = 'Iniciar sesión — FitBook';
  if (auth.isLogged) return redirectAfterAuth();
  root.innerHTML = shell('Bienvenido de nuevo', 'Inicia sesión para reservar tus clases.', html`
    <form id="login-form" class="form-stack" novalidate>
      <div class="form-alert" role="alert" hidden></div>
      ${field('login-email', 'Correo electrónico', html`<input id="login-email" name="email" type="email" autocomplete="email" required aria-describedby="login-email-err" autofocus>`)}
      ${field('login-password', 'Contraseña', passInput('login-password', 'password', 'current-password'))}
      <button type="submit" class="btn btn-primary btn-block" id="login-submit">Iniciar sesión</button>
    </form>`, html`¿No tienes cuenta? <a href="#/registro">Regístrate</a>`);

  const form = root.querySelector('form');
  const schema = {
    email: [rules.required('El correo'), rules.email()],
    password: [rules.required('La contraseña')]
  };
  liveValidate(form, schema);
  passwordToggle(form);
  form.addEventListener('submit', (e) => { e.preventDefault(); submitHandler(form, schema, api.login); });
}

export function renderRegister(root) {
  document.title = 'Crear cuenta — FitBook';
  if (auth.isLogged) return redirectAfterAuth();
  root.innerHTML = shell('Crea tu cuenta', 'Únete y empieza a reservar en menos de un minuto.', html`
    <form id="register-form" class="form-stack" novalidate>
      <div class="form-alert" role="alert" hidden></div>
      ${field('reg-name', 'Nombre completo', html`<input id="reg-name" name="name" autocomplete="name" required maxlength="80" aria-describedby="reg-name-err" autofocus>`)}
      ${field('reg-email', 'Correo electrónico', html`<input id="reg-email" name="email" type="email" autocomplete="email" required maxlength="120" aria-describedby="reg-email-err">`)}
      ${field('reg-phone', 'Teléfono (opcional)', html`<input id="reg-phone" name="phone" type="tel" autocomplete="tel" maxlength="20" aria-describedby="reg-phone-err">`)}
      ${field('reg-password', 'Contraseña', passInput('reg-password', 'password', 'new-password'), 'Mínimo 8 caracteres, con letras y números.')}
      ${field('reg-confirm', 'Confirmar contraseña', html`<input id="reg-confirm" name="confirm" type="password" autocomplete="new-password" required maxlength="72" aria-describedby="reg-confirm-err">`)}
      <button type="submit" class="btn btn-primary btn-block" id="register-submit">Crear cuenta</button>
    </form>`, html`¿Ya tienes cuenta? <a href="#/login">Inicia sesión</a>`);

  const form = root.querySelector('form');
  const schema = {
    name: [rules.required('El nombre'), rules.min(2), rules.max(80)],
    email: [rules.required('El correo'), rules.email()],
    phone: [rules.phone()],
    password: [rules.required('La contraseña'), rules.password()],
    confirm: [rules.required('La confirmación'), rules.match('password', 'Las contraseñas no coinciden')]
  };
  liveValidate(form, schema);
  passwordToggle(form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitHandler(form, schema, ({ confirm, ...data }) => api.register(data));
  });
}
