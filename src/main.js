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

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
