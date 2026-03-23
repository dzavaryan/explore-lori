'use strict';
const { esc } = require('../injector');

function buildStaysGrid(items) {
  return items.map(item => {
    const image = item.image || 'images/placeholder.svg';
    const amenities = Array.isArray(item.amenities) ? item.amenities : [];

    return `  <article class="stay-card${item.featured ? ' stay-card--featured' : ''}">
    <div class="stay-card__img">
      <img src="/${esc(image)}" alt="${esc(item.name)}" loading="lazy" onerror="this.src='/images/placeholder.svg'">
    </div>
    <div class="stay-card__body">
      <span class="stay-card__type">${esc(item.type || '')}</span>
      <h3 class="stay-card__name">${esc(item.name)}</h3>
      <p class="stay-card__location">${esc(item.village || '')}${item.region ? ', ' + esc(item.region) : ''}</p>
      <p class="stay-card__excerpt">${esc(item.excerpt || '')}</p>
      ${item.priceRange ? `<p class="stay-card__price">${esc(item.priceRange)}</p>` : ''}
      ${amenities.length ? `<ul class="stay-card__amenities">${amenities.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
      <div class="stay-card__actions">
        ${item.website ? `<a href="${esc(item.website)}" class="btn btn--outline btn--sm" target="_blank" rel="noopener">View →</a>` : ''}
        ${item.bookingUrl ? `<a href="${esc(item.bookingUrl)}" class="btn btn--primary btn--sm" target="_blank" rel="noopener">Book</a>` : ''}
      </div>
    </div>
  </article>`;
  }).join('\n');
}

module.exports = { buildStaysGrid };
