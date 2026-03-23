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
          type="button"
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
      <button type="button" class="quiz-skip js-quiz-skip">Skip this question →</button>
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
        <button type="button" class="btn btn--gold quiz-cta js-quiz-submit">
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
