// SafePrompt landing page: hero animation, video player, live masking demo.
// Everything here runs locally in the page. Nothing typed into the demo is sent anywhere.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ------------------------------------------------------------------
   Hero: type a prompt, flag the PII, warn, then turn it into tokens
------------------------------------------------------------------- */
(function heroMock() {
  const mock = document.getElementById('heroMock');
  const textEl = document.getElementById('heroText');
  if (!mock || !textEl) return;
  const label = mock.querySelector('.js-secure-label');

  const parts = [
    ['Write a follow-up email to ', null],
    ['Jane Cohen', 'NAME_1'],
    [' (', null],
    ['jane.cohen@acme.com', 'EMAIL_1'],
    [', ', null],
    ['054-381-2297', 'PHONE_1'],
    [') about invoice #4471 for client ID ', null],
    ['3049-7731', 'ID_1'],
    ['.', null],
  ];
  const full = parts.map((p) => p[0]).join('');

  const render = (mode, typed = full.length) => {
    if (mode === 'typing') {
      textEl.innerHTML = esc(full.slice(0, typed)) + '<span class="caret"></span>';
      return;
    }
    textEl.innerHTML = parts
      .map(([txt, tok]) => {
        if (!tok) return esc(txt);
        if (mode === 'flagged') return `<mark>${esc(txt)}</mark>`;
        return `<code class="tok is-new">[[SP_${tok}]]</code>`;
      })
      .join('');
  };

  const setStage = (n) => {
    mock.dataset.stage = String(n);
    label.textContent = n === 3 ? 'Secured!' : 'Secure Send';
  };

  if (reduceMotion) {
    render('masked');
    setStage(3);
    return;
  }

  let visible = true;
  let timer;
  const wait = (ms) =>
    new Promise((res) => {
      const tick = () => {
        if (visible && !document.hidden) timer = setTimeout(res, ms);
        else timer = setTimeout(tick, 400);
      };
      tick();
    });

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }).observe(mock);

  async function loop() {
    for (;;) {
      setStage(0);
      for (let i = 0; i <= full.length; i++) {
        render('typing', i);
        await wait(i < 3 ? 120 : 26);
      }
      await wait(500);
      setStage(1);
      render('flagged');
      await wait(900);
      setStage(2);
      await wait(1900);
      setStage(3);
      render('masked');
      await wait(3600);
    }
  }
  loop();
})();

/* ------------------------------------------------------------------
   Video: our own poster + play button. The YouTube player (privacy-enhanced
   youtube-nocookie domain) only loads after the visitor presses play.
------------------------------------------------------------------- */
(function tourVideo() {
  const box = document.getElementById('tour');
  const btn = document.getElementById('tourPlay');
  if (!box || !btn) return;
  const id = box.dataset.youtube;
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    f.title = 'SafePrompt overview video';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    box.classList.add('is-playing');
    box.appendChild(f);
  };
  btn.addEventListener('click', start);
  document.querySelectorAll('a[href="#watch"]').forEach((a) =>
    a.addEventListener('click', () => setTimeout(start, reduceMotion ? 0 : 600)),
  );
})();

/* ------------------------------------------------------------------
   Live demo: a small, local version of SafePrompt's detection
------------------------------------------------------------------- */
const FIRST_NAMES = new Set(
  `James John Robert Michael William David Richard Joseph Thomas Daniel Matthew Anthony Mark Paul Steven Andrew Joshua Kevin Brian George Edward Ryan Jacob Gary Eric Jonathan Stephen Justin Scott Benjamin Samuel Alexander Patrick Jack Dennis Peter Adam Nathan Henry Noah Ethan Liam Lucas Oliver
   Mary Patricia Jennifer Linda Elizabeth Barbara Susan Jessica Sarah Karen Lisa Nancy Betty Margaret Sandra Ashley Emily Donna Michelle Carol Amanda Melissa Deborah Stephanie Rebecca Laura Sharon Cynthia Amy Anna Emma Olivia Sophia Rachel Hannah Julia Grace Chloe Jane Kate Maria Natalie Leah Maya Noa Tamar Shira Yael Michal Noga Ayelet Rivka Miriam
   Yosef Moshe Avi Itai Omer Yonatan Eitan Ariel Amit Assaf Asaf Uri Gil Tal Dana Roni Lior Nir Ido Yuval Ofer Erez Oren Ron Guy Shai Alon Yoni Dov Eli Chaim Ahmed Mohammed Omar Ali Fatima Layla`
    .split(/\s+/)
    .filter(Boolean),
);

const RULES = [
  { type: 'EMAIL', label: 'Email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { type: 'IBAN', label: 'IBAN', re: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,3})?\b/g },
  { type: 'CARD', label: 'Card number', re: /\b\d(?:[ -]?\d){12,18}\b/g, check: luhn },
  { type: 'IP', label: 'IP address', re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
  { type: 'ID', label: 'ID', re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: 'PHONE', label: 'Phone number', re: /(?:\+\d{1,3}[\s.-]?)?\(?\b\d{2,4}\)?[\s.-]\d{3}[\s.-]?\d{3,4}\b/g },
  { type: 'ID', label: 'ID', re: /\b\d{4}-\d{4}\b|\b\d{9}\b/g },
  {
    type: 'NAME',
    label: 'Name',
    re: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?)?\b/g,
    // Keep only matches starting with a known first name; trim a trailing non-surname.
    pick: (m) => {
      const [first, last] = m.split(/\s+/);
      if (!FIRST_NAMES.has(first)) return null;
      return last ? m : first;
    },
  },
];

function luhn(raw) {
  const d = raw.replace(/\D/g, '');
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = +d[d.length - 1 - i];
    if (i % 2) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

function detect(text, customTerms) {
  const spans = [];
  const taken = (s, e) => spans.some((x) => s < x.end && e > x.start);
  const add = (start, end, type, label) => {
    if (end > start && !taken(start, end)) spans.push({ start, end, type, label, value: text.slice(start, end) });
  };

  // Things you highlight win over automatic detection.
  for (const term of customTerms) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    for (const m of text.matchAll(re)) add(m.index, m.index + m[0].length, 'CUSTOM', 'Custom');
  }
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      let val = m[0];
      if (rule.check && !rule.check(val)) continue;
      if (rule.pick) {
        val = rule.pick(val);
        if (!val) continue;
      }
      add(m.index, m.index + val.length, rule.type, rule.label);
    }
  }
  spans.sort((a, b) => a.start - b.start);

  // Same value → same token, numbered per type in order of appearance.
  const counters = {};
  const byValue = new Map();
  for (const s of spans) {
    const key = s.type + '|' + s.value.toLowerCase();
    if (!byValue.has(key)) {
      counters[s.type] = (counters[s.type] || 0) + 1;
      byValue.set(key, `[[SP_${s.type}_${counters[s.type]}]]`);
    }
    s.token = byValue.get(key);
  }
  return spans;
}

(function lab() {
  const input = document.getElementById('labInput');
  const out = document.getElementById('labOut');
  const chips = document.getElementById('labChips');
  const maskBtn = document.getElementById('labMask');
  const hint = document.getElementById('labHint');
  const outLabel = document.getElementById('labOutLabel');
  const note = document.getElementById('labNote');
  const segBtns = document.querySelectorAll('.seg__btn');
  if (!input) return;

  const custom = new Set();
  let view = 'masked';
  let prevTokens = new Set();

  function render() {
    const text = input.value;
    const spans = detect(text, custom);
    let html = '';
    let i = 0;
    const nowTokens = new Set();
    for (const s of spans) {
      html += esc(text.slice(i, s.start));
      nowTokens.add(s.token);
      if (view === 'masked') {
        const fresh = prevTokens.size && !prevTokens.has(s.token) ? ' is-new' : '';
        html += `<code class="tok${fresh}" title="${esc(s.label)}">${esc(s.token)}</code>`;
      } else {
        html += `<mark class="mark--blue">${esc(s.value)}</mark>`;
      }
      i = s.end;
    }
    html += esc(text.slice(i));
    out.innerHTML = html || '<span style="opacity:.5">Start typing on the left.</span>';
    prevTokens = nowTokens;

    const counts = {};
    for (const s of spans) {
      const k = s.type === 'CUSTOM' ? 'Highlighted' : s.label;
      counts[k] = (counts[k] || 0) + 1;
    }
    const entries = Object.entries(counts);
    chips.innerHTML = entries.length
      ? entries
          .map(([k, n]) => `<span class="chip ${k === 'Highlighted' ? 'chip--custom' : 'chip--warn'}">${esc(k)}${n > 1 ? ' ×' + n : ''}</span>`)
          .join('')
      : '<span class="chip">Nothing sensitive yet</span>';
  }

  function updateMaskBtn() {
    const sel = input.value.slice(input.selectionStart, input.selectionEnd).trim();
    maskBtn.disabled = sel.length < 2 || sel.length > 60;
  }

  input.addEventListener('input', render);
  ['select', 'keyup', 'mouseup', 'touchend', 'focus', 'blur'].forEach((ev) => input.addEventListener(ev, updateMaskBtn));
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === input) updateMaskBtn();
  });

  // Keep the textarea selection when the button is pressed.
  maskBtn.addEventListener('mousedown', (e) => e.preventDefault());
  maskBtn.addEventListener('click', () => {
    const sel = input.value.slice(input.selectionStart, input.selectionEnd).trim();
    if (!sel) return;
    custom.add(sel);
    hint.textContent = `Masked every "${sel}" in this prompt.`;
    if (view !== 'masked') setView('masked');
    else render();
    input.setSelectionRange(input.selectionEnd, input.selectionEnd);
    updateMaskBtn();
  });

  function setView(v) {
    view = v;
    segBtns.forEach((b) => {
      const on = b.dataset.view === v;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    outLabel.textContent = v === 'masked' ? 'What the AI receives' : 'What you see after Reveal';
    note.textContent =
      v === 'masked'
        ? 'The AI only ever sees tokens. The real values stay in a temporary vault in your browser tab.'
        : 'Reveal swaps the tokens back on your screen only. Nothing is sent to restore them.';
    prevTokens = new Set();
    render();
  }
  segBtns.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

  render();
})();

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
