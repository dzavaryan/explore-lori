# Onboarding Quiz — Design Spec
**Date:** 2026-03-22
**Project:** Explore Lori (explorelori.com)
**Status:** Approved

---

## Overview

A 5-step onboarding quiz that helps first-time visitors find their personalised start in Lori. Triggered from the homepage hero, presented as a slide-up panel, and resolved by redirecting to the Discover page with URL params that pre-apply the matching filters.

**Stack:** Pure HTML/CSS/JS — no framework, no build step, no backend.

---

## User Flow

```
Homepage hero
  └── "Plan my trip →" button
        └── .quiz-panel animates up from bottom
              ├── Step 1–5: question with visual option cards
              ├── Progress indicator (5 dots)
              └── Step 5: "Show me Lori →" CTA
                    └── redirect → /discover/?type=X&season=X&difficulty=X&circuit=X&days=X
                          └── Discover page reads params on load
                                └── clicks matching filter pills programmatically
                                      └── grid filters to matching cards
```

---

## The 5 Questions

| Step | Question | Options | Filter param |
|------|----------|---------|-------------|
| 1 | What draws you to Lori? | Ancient monasteries / Hiking trails / Village life / Local experiences | `type` → place / trail / village / experience |
| 2 | When are you visiting? | Spring / Summer / Autumn / Winter | `season` |
| 3 | How active do you want to be? | Take it easy / Some walking / Full adventure | `difficulty` → easy / moderate / hard |
| 4 | Which part of Lori calls to you? | Monastery Plateau / Fortress Plateau / Deep Gorges / Northern Steppe / Poet's Highlands / Molokan Highs | `circuit` → monastery / fortress / gorges / steppe / poets / molokan |
| 5 | How many days do you have? | 1–2 days / 3–4 days / 5+ days | `days` → `short` / `medium` / absent (5+ = no limit, param omitted) |

---

## Panel UI Spec

### Structure
```
┌─────────────────────────────────────────┐
│  ←   • • ◉ • •                      ×  │  ← back / progress dots / close
│                                         │
│  How active do you want to be?          │  ← question heading (serif)
│                                         │
│  ┌──────────┐ ┌──────────┐             │
│  │  🌿      │ │  🥾      │             │  ← option cards (icon + label)
│  │ Take it  │ │  Some    │             │
│  │  easy    │ │ walking  │             │
│  └──────────┘ └──────────┘             │
│  ┌──────────┐                          │
│  │  ⛰️      │                          │
│  │  Full    │                          │
│  │adventure │                          │
│  └──────────┘                          │
│                                         │
└─────────────────────────────────────────┘
```

### Visual Properties
- **Panel:** fixed bottom-0, full width, max-height 90vh, border-radius 16px 16px 0 0, background `--parchment`
- **Overlay:** fixed full-screen, background rgba(0,0,0,0.5), z-index below panel
- **Animation:** panel transforms from `translateY(100%)` → `translateY(0)` in 320ms ease-out
- **Progress dots:** 5 dots, active dot uses `--terracotta`, inactive `--stone`
- **Question heading:** `--font-serif`, 22px, `--dark`
- **Option cards:** min-height 72px, border 2px solid `--stone`, border-radius `--radius-lg`, background `--white`
- **Selected state:** border-color `--terracotta`, background tinted terracotta at 8% opacity
- **CTA button (step 5 only):** `.btn--gold`, full width, "Show me Lori →"
- **Tap targets:** minimum 48px height on all interactive elements

### Behaviour
- **Back button:** goes to previous step; hidden on step 1
- **Close / overlay click:** dismisses panel, resets state
- **Option selection:** immediately advances to next step (no separate "next" button for steps 1–4)
- **Step 5:** selection does NOT auto-advance; user presses CTA to confirm and redirect
- **Skip:** each step has a small "Skip →" text link below options (param omitted from URL if skipped)
- **Back navigation:** pressing ← returns to the previous step; the previously selected answer for that step is visually highlighted (selected state) so the user sees their existing choice and can change it or leave it; pressing ← again records whatever is currently selected before going back
- **Options container overflow:** the options container has `overflow-y: auto` and a defined `max-height` (calculated as `90vh - 120px` to account for header + CTA rows) to handle Step 4's 6 circuit options on small screens without clipping

---

## URL Parameter Format

```
/discover/?type=trail&season=summer&difficulty=moderate&circuit=monastery&days=short
```

- All params are optional — skipped steps produce no param
- `days` param values and their card-limit behaviour:

| Quiz answer | `days` value | Cards shown | Remaining hidden with `.quiz-hidden` |
|-------------|-------------|-------------|--------------------------------------|
| 1–2 days | `short` | First 4 in filtered DOM order | Yes — "Show all →" link shown |
| 3–4 days | `medium` | First 8 in filtered DOM order | Yes if >8 — "Show all →" link shown |
| 5+ days | *(omitted)* | All matching cards | No |
| Skipped | *(omitted)* | All matching cards | No |

- "First N in filtered DOM order" means the first N `.discover-card` elements that are not `display:none` after other filters are applied
- "Show all →" link clears `.quiz-hidden` from all cards and removes itself
- Params are read-only on the Discover page — they trigger filter pill clicks then the URL is cleaned with `history.replaceState({}, '', window.location.pathname)` to keep the UI tidy

---

## Discover Page Integration

In `js/main.js`, add an `initFromURLParams()` function that runs on DOMContentLoaded:

1. Read `URLSearchParams` from `window.location.search`; exit early if no recognised params present
2. For each recognised param (`type`, `season`, `difficulty`, `circuit`), select the matching pill using the full two-attribute selector: `document.querySelector('[data-filter="X"][data-group="Y"]')` — never rely on `data-filter` alone since values could overlap across groups
3. Before clicking, check the pill is not already active (check `aria-pressed !== "true"`) to avoid the toggle-off behaviour in `FilterSystem` (clicking an active pill deselects it); only `.click()` if the pill is currently inactive
4. For `days=short` or `days=medium`: after filter pills are applied, collect all visible cards (not `display:none`), add `.quiz-hidden` to cards beyond the limit (4 for `short`, 8 for `medium`), and inject a "Show all results →" `<button>` immediately after the grid; clicking it removes `.quiz-hidden` from all cards and removes the button itself
5. Scroll the page to the discover grid smoothly after params are applied (`#discover-grid` anchor or the first card's parent)
6. Clean the URL: `history.replaceState({}, '', window.location.pathname)` — uses `pathname` not a hardcoded string to support any deployment base path

---

## Homepage Integration

In `index.html`:

1. Add a "Plan my trip →" button to the hero section (secondary style, below main CTA)
2. Add the quiz panel markup at the end of `<body>` (hidden by default)
3. Add a `<script src="/js/quiz.js"></script>` reference

---

## New File: `/js/quiz.js`

Self-contained module. No dependencies on `main.js`. Responsibilities:
- Define quiz questions and options as a JS data structure
- Render current step into the panel DOM
- Handle option selection, back, close, skip
- Build URL params string and redirect on CTA click
- Manage open/close animations via CSS class toggling

---

## Files Modified

| File | Change |
|------|--------|
| `index.html` | Add quiz panel markup + "Plan my trip →" button in hero |
| `css/styles.css` | Add quiz panel styles (~80 lines) |
| `js/quiz.js` | New file — quiz logic (~150 lines) |
| `js/main.js` | Add `initFromURLParams()` function (~40 lines) |
| `discover/index.html` | No markup changes needed |

---

## Out of Scope

- Saving quiz state across sessions (no localStorage)
- Analytics events (can be added later)
- Result count preview ("12 places match") — deferred
- Molokan Highs circuit has 0 cards currently — pill will apply filter showing empty state; acceptable for now
