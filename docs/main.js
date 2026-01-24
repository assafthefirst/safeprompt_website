// SafePrompt Landing (static)
// Update this URL once the Chrome Web Store listing is live.
const WEBSTORE_URL = 'https://chromewebstore.google.com/detail/REPLACE_ME';
// Update this URL once upgrade checkout is live.
const UPGRADE_URL = 'https://example.com/upgrade';

function applyWebstoreLinks() {
  const links = document.querySelectorAll('[data-webstore-link="1"]');
  for (const a of links) {
    if (!(a instanceof HTMLAnchorElement)) continue;
    a.href = WEBSTORE_URL;
    a.target = '_blank';
    a.rel = 'noreferrer';
  }

  const note = document.querySelector('[data-webstore-note="1"]');
  if (note) {
    note.textContent =
      WEBSTORE_URL.includes('REPLACE_ME')
        ? 'Chrome Web Store link coming soon. (Placeholder for now)'
        : 'Available on the Chrome Web Store.';
  }
}

function applyUpgradeLinks() {
  const links = document.querySelectorAll('[data-upgrade-link="1"]');
  for (const a of links) {
    if (!(a instanceof HTMLAnchorElement)) continue;
    a.href = UPGRADE_URL;
    a.target = '_blank';
    a.rel = 'noreferrer';
  }
}

function initMobileNav() {
  const btn = document.querySelector('[data-nav-toggle="1"]');
  const nav = document.querySelector('[data-nav="1"]');
  if (!(btn instanceof HTMLButtonElement) || !(nav instanceof HTMLElement)) return;

  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('isOpen');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

function initTabs() {
  const tabList = document.querySelector('[data-tabs="1"]');
  if (!tabList) return;

  const buttons = Array.from(tabList.querySelectorAll('button[data-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-panel]'));

  function activate(id) {
    for (const b of buttons) b.setAttribute('aria-selected', b.dataset.tab === id ? 'true' : 'false');
    for (const p of panels) p.classList.toggle('isActive', p.getAttribute('data-panel') === id);
  }

  for (const b of buttons) {
    b.addEventListener('click', () => activate(b.dataset.tab));
  }

  // default
  activate(buttons[0]?.dataset?.tab || 'secure');
}

function initSmoothScroll() {
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const a = t.closest('a[href^="#"]');
    if (!(a instanceof HTMLAnchorElement)) return;
    const id = a.getAttribute('href')?.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

applyWebstoreLinks();
applyUpgradeLinks();
initMobileNav();
initTabs();
initSmoothScroll();

