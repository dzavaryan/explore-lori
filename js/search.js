/* ============================================================
   Explore Lori — search.js  v0.01
   Full-text client-side search over /search.json index.
   ============================================================ */

(function initSearch() {
  const btn     = document.getElementById('search-btn');
  const overlay = document.getElementById('search-overlay');
  const input   = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const close   = document.getElementById('search-close');
  if (!btn || !overlay || !input) return;

  let index = null;   // loaded once, cached
  let activeIdx = -1; // keyboard cursor

  /* ── Open / close ── */
  function openSearch() {
    overlay.classList.add('search-overlay--open');
    document.body.classList.add('search-open');
    input.value = '';
    results.innerHTML = '';
    activeIdx = -1;
    // Fetch index on first open
    if (!index) {
      fetchIndex().then(() => { if (input.value) doSearch(input.value); });
    }
    requestAnimationFrame(() => input.focus());
  }

  function closeSearch() {
    overlay.classList.remove('search-overlay--open');
    document.body.classList.remove('search-open');
    input.blur();
  }

  btn.addEventListener('click', openSearch);
  close.addEventListener('click', closeSearch);

  // Click backdrop to close
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeSearch();
  });

  /* ── Keyboard ── */
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !overlay.classList.contains('search-overlay--open')) {
      const tag = document.activeElement.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault(); openSearch();
      }
    }
    if (!overlay.classList.contains('search-overlay--open')) return;
    if (e.key === 'Escape') { closeSearch(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); moveCursor(-1); }
    if (e.key === 'Enter')     { activateCursor(); }
  });

  function moveCursor(dir) {
    const items = results.querySelectorAll('.sr-item');
    if (!items.length) return;
    items[activeIdx]?.classList.remove('sr-item--focus');
    activeIdx = Math.max(-1, Math.min(items.length - 1, activeIdx + dir));
    if (activeIdx >= 0) {
      items[activeIdx].classList.add('sr-item--focus');
      items[activeIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  function activateCursor() {
    const items = results.querySelectorAll('.sr-item');
    if (activeIdx >= 0 && items[activeIdx]) {
      const link = items[activeIdx].querySelector('a');
      if (link) { closeSearch(); window.location = link.href; }
    }
  }

  /* ── Input ── */
  input.addEventListener('input', () => {
    activeIdx = -1;
    const q = input.value.trim();
    if (!q || q.length < 2) { results.innerHTML = renderEmpty(q); return; }
    if (!index) { results.innerHTML = '<div class="sr-loading">Loading…</div>'; return; }
    doSearch(q);
  });

  /* ── Fetch index ── */
  async function fetchIndex() {
    try {
      const res = await fetch('/search.json');
      index = await res.json();
    } catch {
      index = [];
    }
  }

  /* ── Search ── */
  function doSearch(q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

    const scored = index.map(item => {
      const title   = (item.title   || '').toLowerCase();
      const excerpt = (item.excerpt || '').toLowerCase();
      const tags    = (item.tags    || '').toLowerCase();
      const date    = (item.date    || '').toLowerCase();
      const haystack = `${title} ${tags} ${excerpt} ${date}`;

      let score = 0;
      for (const t of terms) {
        if (title.includes(t))   score += 10;
        if (tags.includes(t))    score += 5;
        if (excerpt.includes(t)) score += 2;
        if (date.includes(t))    score += 3;
      }
      // All terms must match somewhere
      const allMatch = terms.every(t => haystack.includes(t));
      return allMatch && score > 0 ? { item, score } : null;
    }).filter(Boolean).sort((a, b) => b.score - a.score);

    if (!scored.length) { results.innerHTML = renderNoResults(q); return; }

    // Group by type
    const groups = {};
    const ORDER  = ['place', 'story', 'event', 'stay', 'guide'];
    const LABELS = { place:'Places', story:'Stories', event:'Events', stay:'Stays', guide:'Guides' };
    scored.forEach(({ item }) => {
      (groups[item.type] = groups[item.type] || []).push(item);
    });

    let html = `<div class="sr-count">${scored.length} result${scored.length !== 1 ? 's' : ''} for "<strong>${escHtml(q)}</strong>"</div>`;
    ORDER.filter(t => groups[t]).forEach(type => {
      html += `<div class="sr-group-label">${LABELS[type]}</div>`;
      groups[type].forEach(item => {
        const thumb = item.image
          ? `<img class="sr-thumb" src="/${item.image}" alt="" loading="lazy">`
          : `<div class="sr-thumb sr-thumb--empty"></div>`;
        const snippet = highlight(truncate(item.excerpt || item.tags || '', 90), q);
        const meta = item.date ? `<span class="sr-meta">${escHtml(item.date)}</span>` : '';
        html += `
          <div class="sr-item" role="option">
            <a href="${item.url}" class="sr-link" tabindex="-1" onClick="document.getElementById('search-overlay').classList.remove('search-overlay--open');document.body.classList.remove('search-open')">
              ${thumb}
              <div class="sr-body">
                <div class="sr-title">${highlight(escHtml(item.title), q)}</div>
                ${snippet ? `<div class="sr-snippet">${snippet}${meta}</div>` : meta}
              </div>
              <svg class="sr-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
          </div>`;
      });
    });

    results.innerHTML = html;
  }

  /* ── Helpers ── */
  function renderEmpty(q) {
    if (!q) return `<div class="sr-hint">Type to search stories, places, events, stays and guides<br><kbd>/</kbd> anywhere on the site opens search</div>`;
    return '';
  }
  function renderNoResults(q) {
    return `<div class="sr-empty">No results for "<strong>${escHtml(q)}</strong>"<br><span>Try a place name, season, or activity</span></div>`;
  }
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function truncate(s, n) {
    return s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '…' : s;
  }
  function highlight(text, q) {
    const terms = q.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    let out = text;
    terms.forEach(t => {
      out = out.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'),
        '<mark>$1</mark>');
    });
    return out;
  }
})();
