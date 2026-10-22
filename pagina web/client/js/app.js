import { api, setUnauthorizedHandler } from './api.js';
import { auth } from './state.js';
import { $, spinner } from './utils/dom.js';
import { renderNavbar, highlightActive } from './components/navbar.js';
import { notify } from './components/toast.js';
import { render as renderHome } from './pages/home.js';
import { renderLogin, renderRegister } from './pages/auth.js';
import { render as renderClasses } from './pages/classes.js';
import { render as renderClassDetail } from './pages/classDetail.js';
import { render as renderMyBookings } from './pages/myBookings.js';
import { render as renderProfile } from './pages/profile.js';
import { render as renderAdmin } from './pages/admin.js';
import { renderError } from './pages/error.js';

/**
 * Router por hash. `access`: 'public' | 'auth' | 'admin'.
 * La protección real está en el servidor; esto solo mejora la experiencia.
 */
const routes = [
  { path: /^\/$/, view: renderHome },
  { path: /^\/clases$/, view: renderClasses },
  { path: /^\/clases\/(?<id>\d+)$/, view: renderClassDetail },
  { path: /^\/login$/, view: renderLogin },
  { path: /^\/registro$/, view: renderRegister },
  { path: /^\/mis-reservas$/, view: renderMyBookings, access: 'auth' },
  { path: /^\/perfil$/, view: renderProfile, access: 'auth' },
  { path: /^\/admin(?:\/(?<tab>[a-z]+))?$/, view: renderAdmin, access: 'admin' }
];

const main = $('#main');

function router() {
  const hash = location.hash.slice(1) || '/';
  const path = hash.split('?')[0];
  highlightActive();
  window.scrollTo(0, 0);

  for (const r of routes) {
    const m = path.match(r.path);
    if (!m) continue;
    if (r.access && !auth.isLogged) {
      notify.info('Inicia sesión para continuar');
      location.replace(`#/login?next=${encodeURIComponent(path)}`);
      return;
    }
    if (r.access === 'admin' && !auth.isAdmin) return renderError(main, { code: 403 });
    try {
      r.view(main, m.groups || {});
    } catch (err) {
      console.error(err);
      renderError(main, { code: 500 });
    }
    main.focus({ preventScroll: true });
    return;
  }
  renderError(main, { code: 404 });
}

setUnauthorizedHandler(() => {
  if (auth.isLogged) {
    auth.set(null);
    notify.error('Tu sesión expiró. Inicia sesión de nuevo.');
    location.hash = `#/login?next=${encodeURIComponent(location.hash.slice(1).split('?')[0])}`;
  }
});

auth.subscribe(renderNavbar);
window.addEventListener('hashchange', router);

async function boot() {
  main.innerHTML = spinner('Iniciando…');
  try {
    const { user } = await api.me();
    auth.set(user);
  } catch (err) {
    auth.set(null);
    if (err.status === 0) notify.error(err.message);
  }
  router();
  $('#year').textContent = new Date().getFullYear();
}

boot();
