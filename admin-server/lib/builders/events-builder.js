'use strict';
const { esc } = require('../injector');

const MONTH_NUM = {
  Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6,
  Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12
};

const CAT_CLASS = {
  'Festival': 'cat--festival',
  'Religious': 'cat--religious',
  'Food & Foraging': 'cat--food-foraging',
  'Food & Drink': 'cat--food-drink',
  'Craft': 'cat--craft',
  'Outdoors': 'cat--outdoors',
  'Music': 'cat--music'
};

function buildEventsBody(items) {
  // Sort by date
  const sorted = [...items].sort((a, b) => {
    const da = new Date(a.year, (MONTH_NUM[a.month] || 1) - 1, parseInt(a.day) || 1);
    const db = new Date(b.year, (MONTH_NUM[b.month] || 1) - 1, parseInt(b.day) || 1);
    return da - db;
  });

  // Group by "Month Year"
  const groups = {};
  const groupOrder = [];
  for (const item of sorted) {
    const key = `${item.month} ${item.year}`;
    if (!groups[key]) {
      groups[key] = [];
      groupOrder.push(key);
    }
    groups[key].push(item);
  }

  return groupOrder.map(key => {
    const cards = groups[key].map(item => {
      const catClass = CAT_CLASS[item.category] || 'cat--other';
      return `    <article class="ev-card ${esc(catClass)}" data-category="${esc(item.category || '')}" aria-label="${esc(item.title)}">
      <div class="ev-card__top">
        <div class="ev-card__date">
          <span class="ev-card__day">${esc(item.day)}</span>
          <span class="ev-card__month-lbl">${esc(item.month)}</span>
        </div>
        <span class="ev-card__cat">${esc(item.category || '')}</span>
      </div>
      <h3 class="ev-card__title">${esc(item.title)}</h3>
      ${item.description ? `<p class="ev-card__desc">${esc(item.description)}</p>` : ''}
      <div class="ev-card__foot">
        <span class="ev-card__loc">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
          ${esc(item.location || '')}
        </span>
        ${item.url ? `<a href="${esc(item.url)}" class="ev-card__link" target="_blank" rel="noopener">Details →</a>` : ''}
      </div>
    </article>`;
    }).join('\n');

    return `  <section class="ev-month">
    <h2 class="ev-month__label">${esc(key)}</h2>
    <div class="ev-month__grid">
${cards}
    </div>
  </section>`;
  }).join('\n');
}

module.exports = { buildEventsBody };
