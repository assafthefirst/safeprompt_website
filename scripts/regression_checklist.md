# SafePrompt Regression Checklist (UX)

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

