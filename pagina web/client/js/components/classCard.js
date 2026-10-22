import { html, icon, fmtDate, fmtMoney, CATEGORY_LABELS, LEVEL_LABELS } from '../utils/dom.js';

export function spotsInfo(cls) {
  const left = Math.max(0, cls.capacity - cls.booked);
  const pct = Math.min(100, Math.round((cls.booked / cls.capacity) * 100));
  const tone = left === 0 ? 'full' : pct >= 75 ? 'warn' : 'ok';
  return { left, pct, tone };
}

export function occupancyBar(cls) {
  const { left, pct, tone } = spotsInfo(cls);
  return html`
    <div class="occupancy">
      <div class="occupancy-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${cls.capacity}"
           aria-valuenow="${cls.booked}" aria-label="Ocupación de la clase">
        <span class="occupancy-fill tone-${tone}" style="width:${pct}%"></span>
      </div>
      <span class="occupancy-text tone-${tone}">${left === 0 ? 'Sin cupos' : `${left} de ${cls.capacity} cupos libres`}</span>
    </div>`;
}

export function classCard(cls) {
  return html`
    <article class="class-card cat-${cls.category}">
      <div class="class-card-top">
        <span class="chip chip-cat">${CATEGORY_LABELS[cls.category]}</span>
        <span class="chip chip-level lvl-${cls.level}">${LEVEL_LABELS[cls.level]}</span>
      </div>
      <h3 class="class-card-title"><a href="#/clases/${cls.id}">${cls.title}</a></h3>
      <ul class="meta-list">
        <li>${icon('calendar')}<span>${fmtDate(cls.starts_at)}</span></li>
        <li>${icon('clock')}<span>${cls.duration_min} min</span></li>
        <li>${icon('user')}<span>${cls.instructor}</span></li>
      </ul>
      ${occupancyBar(cls)}
      <div class="class-card-footer">
        <strong class="price">${cls.price > 0 ? fmtMoney(cls.price) : 'Gratis'}</strong>
        <a class="btn btn-sm btn-primary" href="#/clases/${cls.id}" aria-label="Ver detalles de ${cls.title}">Ver detalles ${icon('arrow-right')}</a>
      </div>
    </article>`;
}

export function skeletonCards(n = 6) {
  return html`${Array.from({ length: n }, () => html`<div class="class-card skeleton" aria-hidden="true">
    <span class="sk sk-chip"></span><span class="sk sk-title"></span><span class="sk sk-line"></span><span class="sk sk-line short"></span><span class="sk sk-bar"></span></div>`)}`;
}
