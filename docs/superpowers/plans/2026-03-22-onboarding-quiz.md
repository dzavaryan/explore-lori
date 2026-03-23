# Onboarding Quiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5-step slide-up quiz panel to the homepage hero that redirects to `/discover/` with URL params pre-applying the matching filters.

**Architecture:** A new self-contained `quiz.js` file handles all quiz logic; `index.html` gets the panel markup and a trigger button in the hero; `css/styles.css` gets the panel styles; `js/main.js` gets a small `initFromURLParams()` function that reads the URL params on the Discover page and programmatically activates the matching filter pills.

**Tech Stack:** Vanilla HTML/CSS/JS — no framework, no build step, no backend.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `index.html` | Modify | Add "Plan my trip →" button to `.hero__actions`; add quiz panel markup before `</body>` |
| `css/styles.css` | Modify | Add ~90 lines of quiz panel styles at end of file |
| `js/quiz.js` | Create | All quiz logic: step data, rendering, navigation, URL building, redirect |
| `js/main.js` | Modify | Add `initFromURLParams()` at bottom of DOMContentLoaded handler |

---

## Task 1: Add quiz panel markup to index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add "Plan my trip →" button to hero actions**

Find the `.hero__actions` div (around line 87). It currently has two buttons. Add a third:

```html
<div class="hero__actions">
  <a href="/discover/" class="btn btn--primary btn--lg">Start Exploring</a>
  <a href="/stories/" class="btn btn--ghost btn--lg">Read the Stories</a>
  <button class="btn btn--outline btn--lg js-quiz-open" aria-haspopup="dialog">Plan my trip →</button>
</div>
```

- [ ] **Step 2: Add quiz panel markup before `</body>`**

Add the following block immediately before the closing `</body>` tag. Note: the panel is hidden by default (no `.quiz-panel--open` class). The step content is rendered by `quiz.js` — the `.quiz-panel__body` div starts empty.

```html
<!-- Quiz panel -->
<div class="quiz-overlay js-quiz-overlay" aria-hidden="true"></div>
<div class="quiz-panel js-quiz-panel" role="dialog" aria-modal="true" aria-label="Plan my trip" aria-hidden="true">
  <div class="quiz-panel__header">
    <button class="quiz-panel__back js-quiz-back" aria-label="Previous question" hidden>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M12 4 L6 10 L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="quiz-panel__dots js-quiz-dots" aria-hidden="true">
      <span class="quiz-dot"></span>
      <span class="quiz-dot"></span>
      <span class="quiz-dot"></span>
      <span class="quiz-dot"></span>
      <span class="quiz-dot"></span>
    </div>
    <button class="quiz-panel__close js-quiz-close" aria-label="Close">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 4 L16 16 M16 4 L4 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
  <div class="quiz-panel__body js-quiz-body">
    <!-- Rendered by quiz.js -->
  </div>
  <div class="quiz-panel__footer js-quiz-footer">
    <!-- CTA button rendered by quiz.js on step 5 -->
  </div>
</div>

<script src="/js/quiz.js"></script>
```

- [ ] **Step 3: Verify markup is valid**

Open `http://localhost:3001/` in browser. Page should load with no visible change (panel is hidden). Open DevTools → Elements → confirm `.quiz-panel` exists. Confirm "Plan my trip →" button appears in the hero section.

- [ ] **Step 4: Commit**

```bash
git -C /Users/gogadzavaryan/Desktop/LORI/Website/explore-lori-v0.18 add index.html
git -C /Users/gogadzavaryan/Desktop/LORI/Website/explore-lori-v0.18 commit -m "feat: add quiz panel markup and trigger button to homepage hero"
```

---

## Task 2: Add quiz panel CSS

**Files:**
- Modify: `css/styles.css` (append at end of file)

- [ ] **Step 1: Append quiz styles to end of styles.css**

```css
/* ── Quiz Panel ─────────────────────────────────────────────── */
.quiz-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 900;
  opacity: 0;
  pointer-events: none;
  transition: opacity 320ms ease;
}
.quiz-overlay--visible {
  opacity: 1;
  pointer-events: all;
}

.quiz-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 901;
  background: var(--parchment);
  border-radius: 16px 16px 0 0;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 320ms ease-out;
  box-shadow: 0 -4px 32px rgba(0,0,0,0.18);
}
.quiz-panel--open {
  transform: translateY(0);
}

/* Header row */
.quiz-panel__header {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  padding: 16px 16px 12px;
  flex-shrink: 0;
}
.quiz-panel__back,
.quiz-panel__close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--slate-mid);
  padding: 8px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}
.quiz-panel__back:hover,
.quiz-panel__close:hover {
  color: var(--dark);
  background: var(--stone);
}
.quiz-panel__close { margin-left: auto; }

/* Progress dots */
.quiz-panel__dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}
.quiz-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--stone);
  transition: background 0.2s, transform 0.2s;
}
.quiz-dot--active {
  background: var(--terracotta);
  transform: scale(1.25);
}

/* Body — scrollable, explicit max-height for mobile reliability */
.quiz-panel__body {
  flex: 1;
  overflow-y: auto;
  max-height: calc(90vh - 120px); /* 120px = header (60px) + footer (60px) */
  padding: 8px 20px 16px;
  -webkit-overflow-scrolling: touch;
}

/* Question */
.quiz-question {
  font-family: var(--font-serif);
  font-size: clamp(18px, 5vw, 24px);
  color: var(--dark);
  margin: 0 0 20px;
  line-height: 1.3;
}

/* Option grid */
.quiz-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.quiz-options--wide {
  grid-template-columns: 1fr;
}
.quiz-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 80px;
  padding: 14px 12px;
  background: var(--white);
  border: 2px solid var(--stone);
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
  text-align: center;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  line-height: 1.3;
}
.quiz-option:hover {
  border-color: var(--slate-mid);
}
.quiz-option--selected {
  border-color: var(--terracotta);
  background: rgba(140, 74, 42, 0.07);
  color: var(--terracotta);
}
.quiz-option__icon {
  font-size: 22px;
  line-height: 1;
}

/* Skip link */
.quiz-skip {
  display: block;
  text-align: center;
  margin-top: 14px;
  font-size: 12px;
  color: var(--slate-mid);
  text-decoration: underline;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  padding: 4px;
}
.quiz-skip:hover { color: var(--dark); }

/* Footer CTA */
.quiz-panel__footer {
  padding: 12px 20px 20px;
  flex-shrink: 0;
}
.quiz-panel__footer:empty { display: none; }
.quiz-cta {
  width: 100%;
  padding: 15px;
  font-size: 16px;
  font-weight: 700;
}
```

- [ ] **Step 2: Verify styles load**

Open `http://localhost:3001/` in browser. Open DevTools → Elements → confirm `.quiz-panel` still exists and shows `transform: translateY(100%)`. No layout errors on the page.

- [ ] **Step 3: Commit**

```bash
git -C /Users/gogadzavaryan/Desktop/LORI/Website/explore-lori-v0.18 add css/styles.css
git -C /Users/gogadzavaryan/Desktop/LORI/Website/explore-lori-v0.18 commit -m "feat: add quiz panel CSS styles"
```

---

## Task 3: Create quiz.js — data and rendering

**Files:**
- Create: `js/quiz.js`

This file is fully self-contained. It does not import or depend on `main.js`.

- [ ] **Step 1: Create js/quiz.js with quiz data and renderer**

```javascript
/* ============================================================
   Explore Lori — quiz.js
   5-step onboarding quiz. Self-contained. No dependencies.
   Builds URL params → redirects to /discover/
   ============================================================ */
(function QuizPanel() {

  /* ── Quiz data ── */
  const STEPS = [
    {
      id: 'type',
      param: 'type',
      question: 'What draws you to Lori?',
      options: [
        { icon: '⛪', label: 'Ancient monasteries', value: 'place' },
        { icon: '🥾', label: 'Hiking trails',       value: 'trail' },
        { icon: '🏡', label: 'Village life',         value: 'village' },
        { icon: '🫙', label: 'Local experiences',    value: 'experience' },
      ]
    },
    {
      id: 'season',
      param: 'season',
      question: 'When are you visiting?',
      options: [
        { icon: '🌸', label: 'Spring',  value: 'spring' },
        { icon: '☀️', label: 'Summer',  value: 'summer' },
        { icon: '🍂', label: 'Autumn',  value: 'autumn' },
        { icon: '❄️', label: 'Winter',  value: 'winter' },
      ]
    },
    {
      id: 'difficulty',
      param: 'difficulty',
      question: 'How active do you want to be?',
      options: [
        { icon: '🌿', label: 'Take it easy',    value: 'easy' },
        { icon: '🚶', label: 'Some walking',    value: 'moderate' },
        { icon: '⛰️', label: 'Full adventure',  value: 'hard' },
      ]
    },
    {
      id: 'circuit',
      param: 'circuit',
      question: 'Which part of Lori calls to you?',
      wide: true,
      options: [
        { icon: '🕌', label: 'Monastery Plateau', value: 'monastery' },
        { icon: '🏰', label: 'Fortress Plateau',  value: 'fortress' },
        { icon: '🏞️', label: 'Deep Gorges',       value: 'gorges' },
        { icon: '🌾', label: 'Northern Steppe',   value: 'steppe' },
        { icon: '📖', label: "Poet's Highlands",  value: 'poets' },
        { icon: '🏔️', label: 'Molokan Highs',     value: 'molokan' },
      ]
    },
    {
      id: 'days',
      param: 'days',
      question: 'How many days do you have?',
      options: [
        { icon: '⚡', label: '1–2 days', value: 'short' },
        { icon: '📅', label: '3–4 days', value: 'medium' },
        { icon: '🗺️', label: '5+ days',  value: null },  /* null = omit param */
      ]
    },
  ];

  /* ── State ── */
  let currentStep = 0;
  const answers = {};   /* { type: 'trail', season: 'summer', ... } */

  /* ── DOM refs (populated in init) ── */
  let panel, overlay, body, footer, dotsEl, backBtn;

  /* ── Open / Close ── */
  function open() {
    currentStep = 0;
    Object.keys(answers).forEach(k => delete answers[k]);
    render();
    panel.classList.add('quiz-panel--open');
    overlay.classList.add('quiz-overlay--visible');
    panel.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    panel.classList.remove('quiz-panel--open');
    overlay.classList.remove('quiz-overlay--visible');
    panel.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ── Render current step ── */
  function render() {
    const step = STEPS[currentStep];

    /* Progress dots */
    const dots = dotsEl.querySelectorAll('.quiz-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('quiz-dot--active', i === currentStep);
    });

    /* Back button */
    backBtn.hidden = currentStep === 0;

    /* Options list */
    const savedAnswer = answers[step.param];
    const optionsHTML = step.options.map(opt => `
      <li>
        <button
          class="quiz-option${savedAnswer === opt.value ? ' quiz-option--selected' : ''}"
          data-value="${opt.value ?? ''}"
          data-param="${step.param}"
        >
          <span class="quiz-option__icon" aria-hidden="true">${opt.icon}</span>
          ${opt.label}
        </button>
      </li>
    `).join('');

    body.innerHTML = `
      <h2 class="quiz-question">${step.question}</h2>
      <ul class="quiz-options${step.wide ? ' quiz-options--wide' : ''}" role="list">
        ${optionsHTML}
      </ul>
      <button class="quiz-skip js-quiz-skip" type="button">Skip this question →</button>
    `;

    /* Bind option clicks */
    body.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => selectOption(btn));
    });

    /* Bind skip */
    body.querySelector('.js-quiz-skip').addEventListener('click', skipStep);

    /* Footer: CTA only on last step */
    if (currentStep === STEPS.length - 1) {
      footer.innerHTML = `
        <button class="btn btn--gold quiz-cta js-quiz-submit" type="button">
          Show me Lori →
        </button>
      `;
      footer.querySelector('.js-quiz-submit').addEventListener('click', submit);
    } else {
      footer.innerHTML = '';
    }
  }

  /* ── Option selection ── */
  function selectOption(btn) {
    const step = STEPS[currentStep];
    const rawValue = btn.dataset.value;
    /* empty string means null (5+ days → omit param) */
    answers[step.param] = rawValue === '' ? null : rawValue;

    /* On steps 1–4: auto-advance after brief highlight */
    if (currentStep < STEPS.length - 1) {
      btn.classList.add('quiz-option--selected');
      setTimeout(advance, 220);
    } else {
      /* Step 5: just highlight, wait for CTA */
      body.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('quiz-option--selected'));
      btn.classList.add('quiz-option--selected');
    }
  }

  /* ── Navigation ── */
  function advance() {
    if (currentStep < STEPS.length - 1) {
      currentStep++;
      render();
    }
  }

  function goBack() {
    if (currentStep > 0) {
      currentStep--;
      render();
    }
  }

  function skipStep() {
    const step = STEPS[currentStep];
    delete answers[step.param];   /* ensure not set */
    if (currentStep < STEPS.length - 1) {
      currentStep++;
      render();
    } else {
      submit();
    }
  }

  /* ── Build URL and redirect ── */
  function submit() {
    const params = new URLSearchParams();
    STEPS.forEach(step => {
      const val = answers[step.param];
      if (val != null) {           /* null or undefined → skip */
        params.set(step.param, val);
      }
    });
    const qs = params.toString();
    window.location.href = '/discover/' + (qs ? '?' + qs : '');
  }

  /* ── Init ── */
  function init() {
    panel   = document.querySelector('.js-quiz-panel');
    overlay = document.querySelector('.js-quiz-overlay');
    body    = document.querySelector('.js-quiz-body');
    footer  = document.querySelector('.js-quiz-footer');
    dotsEl  = document.querySelector('.js-quiz-dots');
    backBtn = document.querySelector('.js-quiz-back');

    if (!panel) return;   /* not on homepage, bail */

    /* Trigger buttons */
    document.querySelectorAll('.js-quiz-open').forEach(btn => {
      btn.addEventListener('click', open);
    });

    /* Close controls */
    document.querySelector('.js-quiz-close').addEventListener('click', close);
    overlay.addEventListener('click', close);
    backBtn.addEventListener('click', goBack);

    /* Keyboard escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panel.classList.contains('quiz-panel--open')) close();
    });
  }

  /* Guard: if DOMContentLoaded already fired (script is late-body), call init immediately */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
```

- [ ] **Step 2: Verify quiz opens and navigates**

Open `http://localhost:3001/`. Click "Plan my trip →" in the hero. Verify:
- Panel slides up from bottom
- Overlay darkens the page
- Step 1 question shows with 4 option cards
- 5 progress dots visible, first dot highlighted in terracotta
- Clicking an option advances to step 2
- Back button (←) hidden on step 1
- Close (×) dismisses panel
- Clicking overlay dismisses panel
- Escape key dismisses panel

- [ ] **Step 3: Verify full 5-step flow**

Walk through all 5 steps. Verify:
- Progress dot advances each step
- Back button appears from step 2 onward and returns to previous step with previous answer highlighted
- Step 4 shows 6 circuit options in a wider single-column layout
- Step 5 shows "Show me Lori →" gold CTA button (not auto-advance)
- Skipping a step advances without recording an answer
- On step 5, clicking "Show me Lori →" redirects to `/discover/?type=X&season=X…`
- Confirm URL params match selections (check browser address bar before redirect)

- [ ] **Step 4: Commit**

```bash
git -C /Users/gogadzavaryan/Desktop/LORI/Website/explore-lori-v0.18 add js/quiz.js
git -C /Users/gogadzavaryan/Desktop/LORI/Website/explore-lori-v0.18 commit -m "feat: create quiz.js — 5-step onboarding quiz with slide-up panel"
```

---

## Task 4: Add initFromURLParams() to main.js

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Add initFromURLParams function**

In `main.js`, find the **existing** `page--discover` block (around line 192) which already calls `FilterSystem.init` and wires the clear button. Append `initFromURLParams()` **inside** that same block — do NOT create a second `if (body.classList.contains('page--discover'))` block:

```javascript
  /* Discover page */
  if (body.classList.contains('page--discover')) {
    FilterSystem.init('.filter-bar');
    const clearBtn = document.querySelector('.filter-bar__clear');
    if (clearBtn) clearBtn.addEventListener('click', FilterSystem.clearAll);
    initFromURLParams();   /* ← add this line */
  }
```

Then add the two function definitions **after** the closing `});` of the DOMContentLoaded handler (i.e. after line ~217 in the current file):

```javascript
/* ── Quiz URL param → filter pre-application ─────────────────
   Called on /discover/ when redirected from the homepage quiz.
   Reads params, clicks matching filter pills, applies day limit,
   then cleans the URL.
   ─────────────────────────────────────────────────────────── */
function initFromURLParams() {
  const params = new URLSearchParams(window.location.search);
  if (!params.toString()) return;   /* nothing to do */

  /* Map param name → data-group value used in pill markup */
  const paramToGroup = {
    type:       'type',
    season:     'season',
    difficulty: 'difficulty',
    circuit:    'circuit',
  };

  let appliedAny = false;

  Object.entries(paramToGroup).forEach(([param, group]) => {
    const value = params.get(param);
    if (!value) return;
    /* Full two-attribute selector prevents cross-group value collisions */
    const pill = document.querySelector(`[data-filter="${value}"][data-group="${group}"]`);
    if (!pill) {
      console.warn(`[quiz] no pill found for param=${param} value=${value} group=${group} — skipping`);
      return;
    }
    /* Only click if NOT already active — clicking an active pill toggles it off */
    if (pill.getAttribute('aria-pressed') !== 'true') {
      pill.click();
      appliedAny = true;
    }
  });

  /* Days limit — hide cards beyond threshold after filters applied */
  const days = params.get('days');
  if (days === 'short' || days === 'medium') {
    const limit = days === 'short' ? 4 : 8;
    applyDaysLimit(limit);
  }

  /* Scroll grid into view */
  if (appliedAny || days) {
    const grid = document.querySelector('.discover__grid');
    if (grid) {
      const offset = 80;
      const top = grid.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  /* Clean URL — use pathname, not hardcoded string */
  history.replaceState({}, '', window.location.pathname);
}

function applyDaysLimit(limit) {
  const grid = document.querySelector('.discover__grid');
  if (!grid) return;

  /* Collect visible cards in DOM order.
     Match the full watchedAttrs selector from FilterSystem so no card type is missed. */
  const cardSelector = '[data-type], [data-season], [data-difficulty], [data-circuit]';
  const visible = [...grid.querySelectorAll(cardSelector)]
    /* deduplicate — a card with multiple watched attrs would appear multiple times */
    .filter((el, i, arr) => arr.indexOf(el) === i)
    .filter(c => c.style.display !== 'none');

  if (visible.length <= limit) return;   /* nothing to hide */

  /* Hide cards beyond limit */
  visible.slice(limit).forEach(card => card.classList.add('quiz-hidden'));

  /* Inject "Show all" button */
  const showAllBtn = document.createElement('button');
  showAllBtn.className = 'quiz-show-all';
  showAllBtn.type = 'button';
  showAllBtn.textContent = `Show all ${visible.length} results →`;
  showAllBtn.addEventListener('click', () => {
    grid.querySelectorAll('.quiz-hidden').forEach(c => c.classList.remove('quiz-hidden'));
    showAllBtn.remove();
  });
  grid.insertAdjacentElement('afterend', showAllBtn);
}
```

- [ ] **Step 2: Add .quiz-hidden and .quiz-show-all styles to styles.css**

Append to end of `css/styles.css`:

```css
/* Quiz hidden cards (days limit from URL params) */
.quiz-hidden { display: none !important; }

.quiz-show-all {
  display: block;
  margin: 24px auto 0;
  background: none;
  border: 2px solid var(--stone);
  border-radius: var(--radius);
  padding: 12px 24px;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--dark);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.quiz-show-all:hover {
  border-color: var(--ochre);
  background: var(--parchment);
}
```

- [ ] **Step 3: Verify Discover page receives quiz params correctly**

Complete the homepage quiz and select answers:
- Type: Hiking trails
- Season: Summer
- Difficulty: Some walking
- Circuit: Monastery Plateau
- Days: 1–2 days

After redirect, verify on the Discover page:
- URL is clean (no query params in address bar)
- "Trail" filter pill is active (terracotta border)
- "Summer" filter pill is active
- "Moderate" filter pill is active
- "Monastery Plateau" filter pill is active
- Grid shows max 4 cards
- "Show all X results →" button appears below grid
- Clicking "Show all →" reveals all remaining cards and removes the button
- Page is scrolled to the grid (not stuck at hero top)

- [ ] **Step 4: Verify skip behaviour**

Run quiz again. Skip all steps. Click "Show me Lori →". Verify:
- Redirect to `/discover/` with no query params
- No filters active on Discover page
- All 22 cards visible, no "Show all" button

- [ ] **Step 5: Verify back navigation with pre-filled answers**

Run quiz. Select "Village life" on step 1. Advance to step 2. Press ←. Verify "Village life" option shows as selected (terracotta border). Change to "Hiking trails". Advance through to step 5 and complete. Verify `type=trail` in redirect URL.

- [ ] **Step 6: Commit**

```bash
git -C /Users/gogadzavaryan/Desktop/LORI/Website/explore-lori-v0.18 add js/main.js css/styles.css
git -C /Users/gogadzavaryan/Desktop/LORI/Website/explore-lori-v0.18 commit -m "feat: apply quiz URL params to Discover filter system on page load"
```

---

## Task 5: Mobile polish and edge cases

**Files:**
- Modify: `css/styles.css` (targeted additions)
- Modify: `js/quiz.js` (minor)

- [ ] **Step 1: Test on mobile viewport (375px)**

In browser DevTools, switch to iPhone SE viewport (375 × 667). Walk through the full quiz. Check:
- Step 4 (6 circuit options): do all options fit without clipping? Can you scroll inside the panel if not?
- All tap targets are at least 48px tall
- "Plan my trip →" button fits alongside other hero buttons (or wraps cleanly)
- Gold CTA on step 5 is full-width and easy to tap

- [ ] **Step 2: Fix hero button wrapping on mobile if needed**

If the three hero buttons stack awkwardly on mobile, add to `styles.css`:

```css
@media (max-width: 600px) {
  .hero__actions {
    flex-direction: column;
    align-items: flex-start;
  }
  .hero__actions .btn {
    width: 100%;
    text-align: center;
  }
}
```

- [ ] **Step 3: Test on desktop (1280px)**

Switch back to desktop viewport. Verify:
- Quiz panel is centred or full-width at max ~480px on desktop (add max-width if panel looks stretched)
- Overlay covers full viewport

Add to `styles.css` if needed:
```css
@media (min-width: 640px) {
  .quiz-panel {
    max-width: 480px;
    left: 50%;
    right: auto;
    transform: translateX(-50%) translateY(100%);
    border-radius: 16px 16px 0 0;
  }
  .quiz-panel--open {
    transform: translateX(-50%) translateY(0);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git -C /Users/gogadzavaryan/Desktop/LORI/Website/explore-lori-v0.18 add css/styles.css
git -C /Users/gogadzavaryan/Desktop/LORI/Website/explore-lori-v0.18 commit -m "feat: quiz panel mobile and desktop viewport polish"
```

---

## Task 6: Push to GitHub and open PR

- [ ] **Step 1: Push branch**

```bash
git -C /Users/gogadzavaryan/Desktop/LORI/Website/explore-lori-v0.18 push origin main
```

- [ ] **Step 2: Verify live on Netlify**

Check Netlify deploy log to confirm build triggered. Open the deploy preview URL and walk through the quiz on mobile.

- [ ] **Step 3: Final smoke test**

- Homepage "Plan my trip →" button opens quiz ✓
- 5 steps navigate correctly with back/skip ✓
- Redirect URL matches selections ✓
- Discover page filters activate and scroll to grid ✓
- Days limit shows "Show all" button and reveals on click ✓
- Escape / overlay closes quiz ✓
- No JS errors in console ✓
