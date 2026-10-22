import { api } from '../api.js';
import { auth } from '../state.js';
import { html, icon, CATEGORY_LABELS } from '../utils/dom.js';
import { classCard, skeletonCards } from '../components/classCard.js';

export function render(root) {
  document.title = 'FitBook — Reserva tus clases de gimnasio';
  root.innerHTML = html`
    <section class="hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="container hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">${icon('bolt')} Reservas en tiempo real</span>
          <h1>Entrena sin filas.<br><span class="gradient-text">Reserva tu lugar</span> en segundos.</h1>
          <p class="lead">FitBook conecta a tu gimnasio con sus socios: consulta horarios, reserva cupos y gestiona tus clases desde cualquier dispositivo.</p>
          <div class="hero-actions">
            <a href="#/clases" class="btn btn-primary btn-lg">Explorar clases ${icon('arrow-right')}</a>
            ${auth.isLogged ? '' : html`<a href="#/registro" class="btn btn-ghost btn-lg">Crear cuenta gratis</a>`}
          </div>
        </div>
        <div class="hero-card glass">
          <img src="/img/gym-hero.svg" alt="Ilustración de equipamiento deportivo y reservas de gimnasio FitBook" class="hero-illustration" width="280" height="190">
          <div class="hero-stat"><span class="hero-stat-num">7</span><span>disciplinas</span></div>
          <div class="hero-stat"><span class="hero-stat-num">24/7</span><span>reservas online</span></div>
          <div class="hero-stat"><span class="hero-stat-num">0</span><span>sobrecupo</span></div>
          <div class="pulse-ring" aria-hidden="true"></div>
        </div>
      </div>
    </section>

    <section class="container section">
      <h2 class="section-title">Cómo funciona</h2>
      <div class="features">
        <div class="feature glass">${icon('search', 'feature-icon')}<h3>Encuentra tu clase</h3><p>Busca por nombre o instructor y filtra por disciplina, nivel o fecha.</p></div>
        <div class="feature glass">${icon('ticket', 'feature-icon')}<h3>Reserva tu cupo</h3><p>El sistema valida cupos y evita que reserves dos clases a la misma hora.</p></div>
        <div class="feature glass">${icon('calendar', 'feature-icon')}<h3>Gestiona tu agenda</h3><p>Consulta tus reservas y cancela hasta 2 horas antes para liberar el lugar.</p></div>
      </div>
    </section>

    <section class="container section">
      <div class="section-head">
        <h2 class="section-title">Próximas clases</h2>
        <a href="#/clases" class="link-more">Ver todas ${icon('arrow-right')}</a>
      </div>
      <div class="cards-grid" id="home-upcoming" aria-busy="true">${skeletonCards(3)}</div>
    </section>

    <section class="container section">
      <h2 class="section-title">Disciplinas</h2>
      <div class="category-pills">
        ${Object.entries(CATEGORY_LABELS).map(([k, l]) => html`<a class="category-pill cat-${k}" href="#/clases?category=${k}">${l}</a>`)}
      </div>
    </section>`;

  const grid = root.querySelector('#home-upcoming');
  api.listClasses({ limit: 3, sort: 'date', order: 'asc' })
    .then(({ items }) => {
      grid.innerHTML = items.length
        ? html`${items.map(classCard)}`
        : html`<p class="muted">No hay clases programadas por ahora.</p>`;
    })
    .catch((err) => { grid.innerHTML = html`<p class="error-inline">${err.message}</p>`; })
    .finally(() => grid.setAttribute('aria-busy', 'false'));
}
