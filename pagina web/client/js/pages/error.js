import { html, icon } from '../utils/dom.js';

export function renderError(root, { code = 404, title, text }) {
  const presets = {
    403: ['Acceso denegado', 'No tienes permisos para ver esta sección.'],
    404: ['Página no encontrada', 'La página que buscas no existe o fue movida.'],
    500: ['Algo salió mal', 'Ocurrió un error inesperado. Intenta de nuevo más tarde.']
  };
  const [t, d] = presets[code] || presets[500];
  document.title = `${title || t} — FitBook`;
  root.innerHTML = html`
    <section class="container section error-page">
      <p class="error-code gradient-text" aria-hidden="true">${code}</p>
      <h1>${title || t}</h1>
      <p class="muted">${text || d}</p>
      <a href="#/" class="btn btn-primary">${icon('home')} Volver al inicio</a>
    </section>`;
}
