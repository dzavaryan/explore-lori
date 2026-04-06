/**
 * Explore Lori — Dynamic Nav
 * Reads /data/nav.json and injects the site header + footer nav.
 * Falls back to DEFAULT_NAV if the fetch fails (e.g. offline / file:// protocol).
 */
(function () {
  'use strict';

  var NAV_DATA_URL = '/data/nav.json';

  var DEFAULT_NAV = {
    site_name: 'Explore Lori',
    tagline: 'Independent editorial platform for Lori Province, Northern Armenia.',
    contact_email: 'hello@explorelori.com',
    links: [
      { label: 'The Chronicle',      href: '/stories/', footer: true  },
      { label: 'The Map',            href: '/discover/', footer: true  },
      { label: 'Getting Here',       href: '/plan/',    footer: true  },
      { label: 'Regional Briefings', href: '/events/',  footer: true  },
      { label: 'About',              href: '/about/',   footer: true  },
      { label: 'Cost Calculator',    href: '/costs/',   footer: true  }
    ]
  };

  /* ── helpers ──────────────────────────────────────────────── */

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function isActive(href) {
    var path = window.location.pathname;
    if (href === '/') return path === '/';
    return path === href || path.indexOf(href) === 0;
  }

  /* ── renderers ────────────────────────────────────────────── */

  function renderHeader(data) {
    var el = document.getElementById('site-header');
    if (!el) return;

    var links = (data && data.links) || DEFAULT_NAV.links;
    var navLinks = '';
    links.forEach(function (link) {
      var cls = isActive(link.href) ? ' class="active"' : '';
      navLinks += '<a href="' + escHtml(link.href) + '"' + cls + '>'
               + escHtml(link.label) + '</a>';
    });

    el.innerHTML =
      '<div class="container">'
    + '<a href="/" class="site-logo">'
    + '<span class="logo-explore">Explore </span>Lori'
    + '</a>'
    + '<nav class="site-nav" id="site-nav" aria-label="Primary navigation">'
    + navLinks
    + '</nav>'
    + '<button class="hamburger" id="hamburger"'
    + ' aria-label="Toggle menu" aria-expanded="false">'
    + '<span></span><span></span><span></span>'
    + '</button>'
    + '</div>';

    bindHamburger();
  }

  function renderFooterNav(data) {
    var el = document.getElementById('footer-nav');
    if (!el) return;

    var links = (data && data.links) || DEFAULT_NAV.links;
    var html = '';
    links.forEach(function (link) {
      if (link.footer !== false) {
        html += '<a href="' + escHtml(link.href) + '">'
             + escHtml(link.label) + '</a>';
      }
    });
    el.innerHTML = html;
  }

  /* ── hamburger ────────────────────────────────────────────── */

  function bindHamburger() {
    var btn = document.getElementById('hamburger');
    var nav = document.getElementById('site-nav');
    if (!btn || !nav) return;

    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── init ─────────────────────────────────────────────────── */

  function applyNav(data) {
    renderHeader(data);
    renderFooterNav(data);
  }

  function init() {
    fetch(NAV_DATA_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(applyNav)
      .catch(function () {
        applyNav(DEFAULT_NAV);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
