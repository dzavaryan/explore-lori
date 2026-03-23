/**
 * Explore Lori — Admin Core Utilities
 * Shared helpers available globally as window.AdminCore
 */

(function () {
  'use strict';

  window.AdminCore = {

    /**
     * Generic fetch wrapper.
     * Prepends '/api' to the given path, sends JSON, and returns parsed response.
     * Throws an Error with the server's error message on non-2xx responses.
     *
     * @param {string} method   HTTP method (GET, POST, PUT, DELETE, …)
     * @param {string} path     API path, e.g. '/listings' — will become '/api/listings'
     * @param {*}      [body]   Optional request body (will be JSON-stringified)
     * @returns {Promise<*>}    Parsed JSON response body
     */
    async api(method, path, body) {
      const options = {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
      };

      if (body !== undefined && body !== null) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch('/api' + path, options);

      let data;
      try {
        data = await response.json();
      } catch (_) {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    },

    /**
     * Display a transient toast notification.
     *
     * @param {string} message  Text to display
     * @param {'success'|'error'|'info'} [type='success']  Visual style
     */
    toast(message, type = 'success') {
      // Resolve or create the container
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.textContent = message;

      container.appendChild(toast);

      // Auto-remove after 3500ms with a fade-out transition
      const hideDelay  = 3500;
      const fadeMs     = 320;

      const timerId = setTimeout(() => {
        toast.classList.add('toast--hiding');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, fadeMs);
      }, hideDelay);

      // Allow immediate dismissal by clicking the toast
      toast.addEventListener('click', () => {
        clearTimeout(timerId);
        toast.classList.add('toast--hiding');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, fadeMs);
      });
    },

    /**
     * Show a confirmation dialog.
     * Returns a Promise that resolves to true (confirmed) or false (cancelled).
     * Phase 2 can swap window.confirm for a custom modal without changing call sites.
     *
     * @param {string} message
     * @returns {Promise<boolean>}
     */
    confirm(message) {
      return Promise.resolve(window.confirm(message));
    },

    /**
     * Append formatted build-status lines to a log element.
     *
     * @param {Array<{section: string, ok: boolean, injected: number, duration: number, error?: string}>} results
     * @param {HTMLElement} logEl  Pre/div element that acts as the build log
     */
    renderBuildStatus(results, logEl) {
      if (!logEl) return;

      results.forEach(function (r) {
        let line;
        if (r.ok) {
          line = `✓ ${r.section} — ${r.injected} card${r.injected !== 1 ? 's' : ''} injected in ${r.duration}ms`;
        } else {
          line = `✗ ${r.section} — ERROR: ${r.error || 'unknown error'}`;
        }
        logEl.textContent += line + '\n';
      });

      // Scroll to bottom so the latest output is visible
      logEl.scrollTop = logEl.scrollHeight;
    },

    /**
     * Format a number with locale-aware comma separators.
     *
     * @param {number|string} n
     * @returns {string}
     */
    fmt(n) {
      return Number(n).toLocaleString();
    },

    /**
     * Open the slide-in edit panel and lock body scroll.
     *
     * @param {HTMLElement} panelEl    The .edit-panel element
     * @param {HTMLElement} overlayEl  The .overlay element
     */
    openPanel(panelEl, overlayEl) {
      panelEl.classList.add('open');
      overlayEl.classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    /**
     * Close the slide-in edit panel and restore body scroll.
     *
     * @param {HTMLElement} panelEl    The .edit-panel element
     * @param {HTMLElement} overlayEl  The .overlay element
     */
    closePanel(panelEl, overlayEl) {
      panelEl.classList.remove('open');
      overlayEl.classList.remove('open');
      document.body.style.overflow = '';
    },

  };
})();
