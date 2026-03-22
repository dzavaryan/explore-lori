/* ============================================================
   Explore Lori — main.js  v0.06
   Content is pre-rendered by Eleventy.
   This file handles: nav, mobile menu, filters, season tabs,
   scroll animations, newsletter/connect forms, smooth scroll.
   No fetch() calls. No content rendering.
   ============================================================ */

/* ── Nav: scroll-solid behaviour ── */
(function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const isHeroPage = document.body.classList.contains('page--home');
  function updateNav() {
    if (!isHeroPage) { nav.classList.add('nav--solid'); return; }
    if (window.scrollY > 60) { nav.classList.add('nav--solid'); }
    else { nav.classList.remove('nav--solid'); }
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();
})();

/* ── Mobile menu ── */
(function initMobileMenu() {
  const toggle  = document.querySelector('.nav__hamburger');
  const drawer  = document.querySelector('.nav__mobile');
  const overlay = document.querySelector('.nav__overlay');
  if (!toggle || !drawer) return;

  function openMenu() {
    drawer.classList.add('open');
    overlay && overlay.classList.add('nav__overlay--visible');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    drawer.classList.remove('open');
    overlay && overlay.classList.remove('nav__overlay--visible');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  toggle.addEventListener('click', () => {
    drawer.classList.contains('open') ? closeMenu() : openMenu();
  });
  overlay && overlay.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  drawer.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

  /* Inject close button if missing */
  if (!drawer.querySelector('.nav__mobile-close')) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'nav__mobile-close';
    closeBtn.setAttribute('aria-label', 'Close menu');
    closeBtn.innerHTML = '&times;';
    drawer.appendChild(closeBtn);
    closeBtn.addEventListener('click', closeMenu);
  }
})();

/* ── Filter system ─────────────────────────────────────────
   Cards are pre-rendered with data-* attributes:
     discover cards → data-type  data-season  data-difficulty
     story cards    → data-pillar
     event rows     → data-category
   Pills carry data-filter (the value) and data-group (the attribute name).
   ─────────────────────────────────────────────────────────── */
const FilterSystem = (function () {
  const state = {};

  function updateToggleBadge() {
    const badge = document.querySelector('.filter-toggle-btn__badge');
    if (!badge) return;
    const n = Object.keys(state).length;
    if (n > 0) { badge.textContent = n; badge.removeAttribute('hidden'); }
    else { badge.setAttribute('hidden', ''); }
  }

  function init(barSelector) {
    const bar = document.querySelector(barSelector);
    if (!bar) return;

    /* Mobile collapse toggle */
    const toggleBtn = bar.querySelector('.filter-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isOpen = bar.classList.toggle('filter-bar--open');
        toggleBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }

    const pills = bar.querySelectorAll('[data-filter]');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const group = pill.dataset.group;
        const value = pill.dataset.filter;

        /* Deselect other pills in same group */
        bar.querySelectorAll(`[data-group="${group}"]`)
           .forEach(p => {
             p.classList.remove('filter-pill--active', 'active', 'pillar-tab--active');
             if (p.hasAttribute('aria-selected')) p.setAttribute('aria-selected', 'false');
             if (p.hasAttribute('aria-pressed'))  p.setAttribute('aria-pressed', 'false');
           });

        if (state[group] === value) {
          delete state[group];                   /* toggle off */
        } else {
          pill.classList.add('filter-pill--active', 'active', 'pillar-tab--active');
          if (pill.hasAttribute('aria-selected')) pill.setAttribute('aria-selected', 'true');
          if (pill.hasAttribute('aria-pressed'))  pill.setAttribute('aria-pressed', 'true');
          state[group] = value;
        }
        applyFilters();

        /* Scroll grid into view so user sees the filtered results */
        const grid = document.querySelector('.discover__grid, .article-grid, #events-grid');
        if (grid) {
          const offset = 80; /* clear fixed nav */
          const top = grid.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  function applyFilters() {
    /* Each filterable item must have at least one of the watched attribute names */
    const watchedAttrs = ['data-type', 'data-season', 'data-difficulty', 'data-pillar', 'data-category', 'data-circuit'];
    const selector = watchedAttrs.map(a => `[${a}]`).join(', ');
    const cards = document.querySelectorAll(selector);

    cards.forEach(card => {
      const visible = Object.entries(state).every(([group, filterVal]) => {
        const cardVal = card.dataset[group] || '';        /* dataset.type, dataset.pillar … */
        /* season can be space-separated list: "spring summer" */
        return cardVal.split(' ').includes(filterVal);
      });
      card.style.display = visible ? '' : 'none';
    });

    /* Empty state message */
    const grids = document.querySelectorAll('.discover__grid, .article-grid, #events-grid');
    grids.forEach(grid => {
      const visible = [...grid.querySelectorAll(selector)].filter(c => c.style.display !== 'none');
      let emptyState = grid.querySelector('.empty-state');
      if (visible.length === 0) {
        if (!emptyState) {
          emptyState = document.createElement('div');
          emptyState.className = 'empty-state';
          emptyState.innerHTML = '<p>Nothing matches those filters — try adjusting or clearing them.</p>';
          grid.appendChild(emptyState);
        }
        emptyState.style.display = '';
      } else {
        if (emptyState) emptyState.style.display = 'none';
      }
    });

    /* Results count */
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      const allCards = [...document.querySelectorAll(selector)];
      const n = allCards.filter(c => c.style.display !== 'none').length;
      const hasFilters = Object.keys(state).length > 0;
      countEl.textContent = hasFilters
        ? `${n} ${n === 1 ? 'result' : 'results'}`
        : `Showing ${n} ${countEl.dataset.noun || 'items'}`;
    }

    updateToggleBadge();
  }

  function clearAll() {
    Object.keys(state).forEach(k => delete state[k]);
    document.querySelectorAll('[data-filter]')
            .forEach(p => p.classList.remove('filter-pill--active', 'active', 'pillar-tab--active'));
    /* Restore "All Stories" active state if present */
    const allTab = document.querySelector('[data-filter="all"]');
    if (allTab) allTab.classList.add('pillar-tab--active');
    updateToggleBadge();
    applyFilters();
  }

  return { init, applyFilters, clearAll, getState: () => ({ ...state }) };
})();

/* ── Page-specific filter wiring ── */
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;

  /* Discover page */
  if (body.classList.contains('page--discover')) {
    FilterSystem.init('.filter-bar');
    const clearBtn = document.querySelector('.filter-bar__clear');
    if (clearBtn) clearBtn.addEventListener('click', FilterSystem.clearAll);
  }

  /* Stories page — pillar tabs */
  if (body.classList.contains('page--stories')) {
    FilterSystem.init('.pillar-tabs');
    /* "All Stories" tab resets filters */
    const allTab = document.querySelector('[data-filter="all"]');
    if (allTab) {
      allTab.addEventListener('click', () => {
        FilterSystem.clearAll();
        allTab.classList.add('pillar-tab--active');
      });
    }
  }

  /* Events page */
  if (body.classList.contains('page--events')) {
    FilterSystem.init('.events-filter-bar');
    const clearBtn = document.querySelector('.filter-bar__clear');
    if (clearBtn) clearBtn.addEventListener('click', FilterSystem.clearAll);
  }
});

/* ── Season tabs (Plan page) ── */
(function initSeasonTabs() {
  document.addEventListener('DOMContentLoaded', () => {
    const tabs   = document.querySelectorAll('[data-season-tab]');
    const panels = document.querySelectorAll('[data-season-panel]');
    if (!tabs.length) return;
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.seasonTab;
        tabs.forEach(t => t.classList.remove('season-tab--active'));
        panels.forEach(p => p.classList.remove('season-panel--active'));
        tab.classList.add('season-tab--active');
        const panel = document.querySelector(`[data-season-panel="${target}"]`);
        if (panel) panel.classList.add('season-panel--active');
      });
    });
    if (tabs[0]) tabs[0].click();
  });
})();

/* ── Scroll animations (fade-up / fade-in / slide-up) ── */
(function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.fade-in, .slide-up, .fade-up').forEach(el => observer.observe(el));
  });
})();

/* ── Lazy image fade-in ── */
(function initLazyImages() {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      img.classList.add('lazy-fade');
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('loaded');
      } else {
        img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
      }
    });
  });
})();

/* ── Newsletter form (Netlify POST) ── */
(function initNewsletterForm() {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.newsletter-form').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const email = form.querySelector('input[type="email"]')?.value;
        if (!email) return;
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn?.textContent || 'Subscribe';
        if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
        try {
          const res = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ 'form-name': form.getAttribute('name') || 'newsletter', email }).toString()
          });
          if (res.ok) {
            form.innerHTML = '<p class="newsletter__success">Thank you — you\'re on the list. We\'ll be in touch from Lori soon.</p>';
          } else { throw new Error('Not ok'); }
        } catch {
          if (btn) { btn.textContent = originalText; btn.disabled = false; }
          let errEl = form.querySelector('.newsletter__error');
          if (!errEl) { errEl = document.createElement('p'); errEl.className = 'newsletter__error'; form.appendChild(errEl); }
          errEl.textContent = 'Something went wrong. Please try again.';
        }
      });
    });
  });
})();

/* ── Connect page forms (Netlify POST) ── */
(function initConnectForms() {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('page--connect')) return;
    document.querySelectorAll('.connect-form').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const origText = btn ? btn.textContent : 'Send';

        // Clear any previous error
        const prevErr = form.querySelector('.connect-form__error');
        if (prevErr) prevErr.remove();

        if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }

        try {
          const res = await fetch(window.location.href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(new FormData(form)).toString()
          });

          if (res.ok) {
            const success = document.createElement('div');
            success.className = 'connect-form__success';
            success.innerHTML = '<strong>Sent!</strong> We\'ll be in touch soon.';
            form.replaceWith(success);
          } else {
            throw new Error('Server returned ' + res.status);
          }
        } catch (err) {
          if (btn) { btn.textContent = origText; btn.disabled = false; }
          const errEl = document.createElement('p');
          errEl.className = 'connect-form__error';
          errEl.textContent = 'Something went wrong — please try again or email us directly.';
          form.appendChild(errEl);
        }
      });
    });
  });
})();

/* ── Smooth scroll for anchor links ── */
document.addEventListener('click', e => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  const target = document.querySelector(anchor.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
