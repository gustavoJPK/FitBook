import { api } from '../api.js';
import { auth } from '../state.js';
import { html, icon, $ } from '../utils/dom.js';
import { notify } from './toast.js';

/** Barra de navegación adaptativa: enlaces según rol y menú hamburguesa en móvil. */
export function renderNavbar() {
  const nav = $('#navbar');
  const u = auth.user;
  const links = [
    { href: '#/', label: 'Inicio', icon: 'home' },
    { href: '#/clases', label: 'Clases', icon: 'dumbbell' }
  ];
  if (u) links.push({ href: '#/mis-reservas', label: 'Mis reservas', icon: 'ticket' });
  if (u?.role === 'admin') links.push({ href: '#/admin', label: 'Panel admin', icon: 'chart' });

  nav.innerHTML = html`
    <div class="nav-inner container">
      <a href="#/" class="brand" aria-label="FitBook, ir al inicio">
        <img src="/img/favicon.svg" alt="Logotipo de FitBook" class="brand-logo" width="28" height="28">
        <span>Fit<b>Book</b></span>
      </a>
      <button class="icon-btn nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Abrir menú">
        ${icon('menu')}
      </button>
      <div class="nav-menu" id="nav-menu">
        <ul class="nav-links">
          ${links.map((l) => html`<li><a href="${l.href}" class="nav-link" data-path="${l.href}">${icon(l.icon)}<span>${l.label}</span></a></li>`)}
        </ul>
        <div class="nav-actions">
          ${u
            ? html`
              <a href="#/perfil" class="user-pill" title="Mi perfil">
                <span class="avatar" aria-hidden="true">${u.name.charAt(0).toUpperCase()}</span>
                <span class="user-pill-name">${u.name.split(' ')[0]}</span>
                ${u.role === 'admin' ? html`<span class="badge badge-admin">Admin</span>` : ''}
              </a>
              <button class="btn btn-ghost btn-sm" type="button" id="logout-btn">${icon('logout')}<span>Salir</span></button>`
            : html`
              <a href="#/login" class="btn btn-ghost btn-sm">Iniciar sesión</a>
              <a href="#/registro" class="btn btn-primary btn-sm">Crear cuenta</a>`}
        </div>
      </div>
    </div>`;

  const toggle = $('.nav-toggle', nav);
  const menu = $('#nav-menu', nav);
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  $('#logout-btn', nav)?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await api.logout();
      auth.set(null);
      notify.success('Sesión cerrada correctamente');
      location.hash = '#/login';
    } catch (err) {
      notify.error(err.message);
      btn.disabled = false;
    }
  });
  highlightActive();
}

export function highlightActive() {
  const path = location.hash.split('?')[0] || '#/';
  document.querySelectorAll('.nav-link').forEach((a) => {
    const p = a.dataset.path;
    const active = p === '#/' ? path === '#/' || path === '' : path.startsWith(p);
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}
