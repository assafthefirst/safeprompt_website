# SafePrompt Regression Checklist (UX)

## Cross-LLM matrix (logged-in / logged-out)
- Use a **separate clean Chrome profile** (no cookies/extensions except SafePrompt) to validate **logged-out** behavior.
- Sites to validate:
  - ChatGPT (`chatgpt.com`)
  - Gemini (`gemini.google.com`)
  - Claude (`claude.ai`)
  - Grok (`x.ai` / `grok.com`)
  - Copilot (`copilot.microsoft.com`)
  - DeepSeek (`chat.deepseek.com`)

For each site in **both states** (logged-in + logged-out):
- Popup status:
  - Should show **Active** when content script is present
  - Should show **No Access** only when the site is unsupported / script not injected
- Logged-in:
  - Type: `Email test.user@example.com and call +1 (415) 555-0132.`
  - Click **Secure Send** → prompt contains `[[SP_...]]` tokens
  - Send → click **Reveal Original Data** → original values restored
- Logged-out:
  - No crashes / no UI spam
  - Do not inject controls into random inputs
  - If there is no composer, Secure Send should no-op safely (if controls appear at all)

## Watermark + Reveal/Restore
- Secure Send → send → click **Reveal Original Data**:
  - Original values restored correctly
  - Watermark appears **once** and **only at the end**
- Click Reveal twice:
  - Still only one watermark
  - Formatting preserved

## Formatting preservation
- After Reveal/Restore:
  - Headings, lists, line breaks, code blocks remain formatted

## Secure Send button state
- Click Secure Send → label changes to “Secured!”
- Start typing a new prompt → label resets back to “Secure Send”

## Vault (refresh)
- Secure Send → refresh page → Reveal/Restore still works
- Clear Session History → mapping cleared + Reveal button hidden

