'use strict';
const { esc } = require('../injector');

const TYPE_LABELS = {
  trail: 'Trail',
  place: 'Place',
  village: 'Village',
  experience: 'Experience'
};

const DIFFICULTY_LABELS = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard'
};

function buildDiscoverGrid(items) {
  return items.map(item => {
    const typeLabel = TYPE_LABELS[item.type] || item.type || '';
    const diffLabel = DIFFICULTY_LABELS[item.difficulty] || item.difficulty || '';
    const tag = [typeLabel, item.region].filter(Boolean).join(' · ');
    const meta = [item.duration, diffLabel].filter(Boolean).join(' · ');
    const slug = item.slug || item.id;
    const circuit = item.circuit || '';
    const season = item.season || '';
    const difficulty = item.difficulty || '';
    const type = item.type || '';
    const image = item.image || 'images/placeholder.svg';

    return `  <article class="card" data-circuit="${esc(circuit)}" data-type="${esc(type)}" data-season="${esc(season)}" data-difficulty="${esc(difficulty)}">
    <a href="/discover/${esc(slug)}/" class="card-cover-link" tabindex="-1" aria-hidden="true"></a>
    <div class="card__img">
      <img src="/${esc(image)}" alt="${esc(item.title)}" loading="lazy" onerror="this.src='/images/placeholder.svg'">
    </div>
    <div class="card__body">
      <span class="card__tag">${esc(tag)}</span>
      <h3 class="card__title"><a href="/discover/${esc(slug)}/">${esc(item.title)}</a></h3>
      <p class="card__excerpt">${esc(item.excerpt)}</p>
      ${meta ? `<span class="card__meta">${esc(meta)}</span>` : ''}
    </div>
  </article>`;
  }).join('\n');
}

module.exports = { buildDiscoverGrid };
