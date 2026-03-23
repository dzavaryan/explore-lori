'use strict';
const { esc } = require('../injector');

const PILLAR_LABELS = {
  trails: 'Trails &amp; Nature',
  culture: 'Culture &amp; History',
  food: 'Food &amp; Foraging',
  people: 'Local Voices',
  seasons: 'Seasons &amp; Weather'
};

function buildStoriesGrid(items) {
  return items.map(item => {
    const slug = item.slug || item.id;
    const pillarLabel = item.pillarLabel || PILLAR_LABELS[item.pillar] || item.pillar || '';
    const pillarClass = item.pillar ? `pillar-tag--${esc(item.pillar)}` : '';
    const image = item.image || 'images/placeholder.svg';

    return `  <article class="article-card" data-pillar="${esc(item.pillar || '')}">
    <a href="/stories/${esc(slug)}/" class="card-cover-link" tabindex="-1" aria-hidden="true"></a>
    <div class="article-card__img">
      <img src="/${esc(image)}" alt="${esc(item.title)}" loading="lazy" onerror="this.src='/images/placeholder.svg'">
    </div>
    <div class="article-card__body">
      <span class="pillar-tag ${pillarClass}">${pillarLabel}</span>
      <h3 class="article-card__title"><a href="/stories/${esc(slug)}/">${esc(item.title)}</a></h3>
      <p class="article-card__excerpt">${esc(item.excerpt)}</p>
      <div class="article-card__meta">
        <span>By ${esc(item.author || '')}</span>
        <span class="byline__dot" aria-hidden="true">·</span>
        <span>${esc(String(item.readTime || ''))} min read</span>
      </div>
    </div>
  </article>`;
  }).join('\n');
}

module.exports = { buildStoriesGrid };
