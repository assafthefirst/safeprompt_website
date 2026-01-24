# SafePrompt Enterprise (Chrome Extension)

Vite (Vanilla JS) + CRXJS extension that sanitizes PII in prompts and restores it in responses.

## Setup

```bash
npm install
```

## Build the extension

```bash
npm run build
```

Then in Chrome:
- Open `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked**
- Select the `dist/` folder

## Notes

- Popup UI: `index.html` (root)
- Content script: `src/content.js`
- Manifest: `manifest.json` (MV3)

