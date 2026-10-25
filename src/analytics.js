// Google Analytics 4, loaded ONLY after the visitor clicks "Accept".
// Until then no Google script runs and no cookies are set.
// To change the property, edit GA_ID below.

const GA_ID = 'G-H60BMZ1DT2';
const KEY = 'sp_analytics_consent'; // 'granted' | 'denied'

const banner = document.getElementById('consent');
const settingsBtn = document.getElementById('cookieSettings');

function readChoice() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function saveChoice(v) {
  try { localStorage.setItem(KEY, v); } catch { /* private mode: ask again next visit */ }
}

let loaded = false;
function loadGA() {
  if (loaded || !/^G-[A-Z0-9]+$/.test(GA_ID) || GA_ID === 'G-PLACEHOLDER') return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

function track(name, params = {}) {
  if (loaded && window.gtag) window.gtag('event', name, params);
}

function showBanner(show) {
  if (banner) banner.hidden = !show;
}

// ---- consent flow ----
const choice = readChoice();
if (choice === 'granted') loadGA();
else if (choice !== 'denied') showBanner(true);

banner?.querySelector('[data-consent="accept"]')?.addEventListener('click', () => {
  saveChoice('granted');
  showBanner(false);
  loadGA();
});
banner?.querySelector('[data-consent="decline"]')?.addEventListener('click', () => {
  saveChoice('denied');
  showBanner(false);
});
settingsBtn?.addEventListener('click', () => showBanner(true));

// Declining after accepting: stop sending and clear GA cookies on next load.
banner?.querySelector('[data-consent="decline"]')?.addEventListener('click', () => {
  if (!loaded) return;
  window[`ga-disable-${GA_ID}`] = true;
  document.cookie.split(';').map((c) => c.trim().split('=')[0])
    .filter((n) => n === '_ga' || n.startsWith('_ga_'))
    .forEach((n) => {
      document.cookie = `${n}=; Max-Age=0; path=/; domain=${location.hostname}`;
      document.cookie = `${n}=; Max-Age=0; path=/`;
    });
});

// ---- events ----
function ctaLocation(el) {
  if (el.closest('.nav')) return 'nav';
  if (el.closest('.hero')) return 'hero';
  if (el.closest('#how')) return 'how_it_works';
  if (el.closest('#pricing')) return 'pricing';
  if (el.closest('.final')) return 'final_cta';
  if (el.closest('.footer')) return 'footer';
  return 'other';
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a, button, summary');
  if (!a) return;
  const href = a.getAttribute('href') || '';

  if (href.includes('chromewebstore.google.com')) {
    track('install_click', { cta_location: ctaLocation(a) });
  } else if (href.includes('lemonsqueezy.com/checkout')) {
    track('begin_checkout', { currency: 'USD', value: 6.99, items: [{ item_name: 'SafePrompt Pro' }] });
  } else if (a.id === 'tourPlay' || href === '#watch') {
    track('video_start', { video_title: 'SafePrompt overview' });
  } else if (a.tagName === 'SUMMARY' && !a.parentElement.open) {
    track('faq_open', { question: a.textContent.trim().slice(0, 100) });
  } else if (href.startsWith('mailto:')) {
    track('contact_click', { cta_location: ctaLocation(a) });
  }
});
