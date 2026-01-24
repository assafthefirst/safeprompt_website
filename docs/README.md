# SafePrompt Landing (GitHub Pages)

This folder contains the **static landing site** for SafePrompt, designed to be hosted on **GitHub Pages**.

## How to publish (GitHub Pages)

1. Push this repository to GitHub.
2. In GitHub: **Settings → Pages**
3. Under “Build and deployment”:
   - Source: **Deploy from a branch**
   - Branch: `main` (or your default branch)
   - Folder: **`/docs`**
4. Save. GitHub will publish the site and show you the URL.

## Update the Chrome Web Store link

When your listing is live, update the constant at the top of:

- `docs/main.js`

Replace:

```js
const WEBSTORE_URL = 'https://chromewebstore.google.com/detail/REPLACE_ME';
```

with your real Chrome Web Store URL.

## Files

- `docs/index.html`: landing page
- `docs/privacy.html`: privacy policy (no data collection / local-only)
- `docs/terms.html`: terms & conditions
- `docs/support.html`: support page
- `docs/styles.css`: shared styling (brand green: `#10a37f`)
- `docs/main.js`: nav + tabs + Web Store URL binding
- `docs/img/*.svg`: placeholder demo visuals (replace with screenshots/GIFs)

