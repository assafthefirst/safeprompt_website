export const WATERMARK_TEXT = '🔒 Protected by SafePrompt (Free Version)'

export function restoreText(text, tokenToReal) {
  let restoredText = String(text ?? '')
  const sortedKeys = Object.keys(tokenToReal).sort((a, b) => b.length - a.length)
  for (const tok of sortedKeys) restoredText = restoredText.split(tok).join(tokenToReal[tok])
  return restoredText
}

export function restoreInDomSubtree(rootEl, tokenToReal, { removeWatermarkText = true } = {}) {
  if (!rootEl) return 0
  const sortedKeys = Object.keys(tokenToReal).sort((a, b) => b.length - a.length)
  if (!sortedKeys.length) return 0

  let replacements = 0

  const visitTextNode = (node) => {
    const parent = node.parentElement
    if (!parent) return

    const tag = parent.tagName?.toLowerCase?.() ?? ''
    if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'input') return

    let v = node.nodeValue
    if (!v) return

    if (removeWatermarkText && v.includes(WATERMARK_TEXT)) v = v.split(WATERMARK_TEXT).join('')

    let changed = false
    for (const tok of sortedKeys) {
      if (v.includes(tok)) {
        v = v.split(tok).join(tokenToReal[tok])
        changed = true
      }
    }

    if (changed || node.nodeValue !== v) {
      node.nodeValue = v
      if (changed) replacements++
    }
  }

  const walk = (node) => {
    if (!node) return
    // 3 = TEXT_NODE
    if (node.nodeType === 3) {
      visitTextNode(node)
      return
    }
    for (const child of node.childNodes ?? []) walk(child)
  }

  walk(rootEl)
  return replacements
}

export function ensureWatermarkOnce(containerEl, { isPremium } = {}) {
  if (!containerEl || isPremium) return
  if (containerEl.querySelector?.('[data-safeprompt-watermark=\"1\"]')) return

  const txt = containerEl.textContent ?? ''
  if (txt.includes(WATERMARK_TEXT)) return

  const wm = document.createElement('div')
  wm.dataset.safepromptWatermark = '1'
  wm.textContent = WATERMARK_TEXT
  Object.assign(wm.style, {
    marginTop: '10px',
    fontSize: '12px',
    color: '#6b7280',
  })
  containerEl.appendChild(wm)
}

