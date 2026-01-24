export function isVisible(el) {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

export function findPromptElement({ debug = false, logDebug = () => {} } = {}) {
  const host = location.host

  const selectorsByHost = {
    'chatgpt.com': ['#prompt-textarea', 'textarea', 'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]'],
    'claude.ai': ['div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]', 'textarea'],
    'gemini.google.com': ['div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]', 'textarea'],
    'grok.com': ['textarea', 'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]'],
    'x.ai': ['textarea', 'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]'],
  }
  const selectors =
    selectorsByHost[host] ?? ['textarea', 'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]']

  const active = document.activeElement
  if (active instanceof Element && isVisible(active)) {
    const isTextarea = active instanceof HTMLTextAreaElement
    const isEditable = !isTextarea && (active.getAttribute('contenteditable') === 'true' || active.isContentEditable)
    if (isTextarea || isEditable) {
      logDebug('Prompt picked via activeElement')
      return active
    }
  }

  const scored = []
  for (const sel of selectors) {
    const candidates = Array.from(document.querySelectorAll(sel)).filter(isVisible)
    for (const el of candidates) {
      const r = el.getBoundingClientRect()
      let score = 0
      score += Math.max(0, Math.min(1000, r.bottom))
      if (r.width >= 300) score += 500
      if (r.left > 120) score += 200
      if (r.height >= 24) score += 50
      scored.push({ el, score, sel, r })
    }
  }

  if (!scored.length) return null
  scored.sort((a, b) => b.score - a.score)

  if (debug) {
    logDebug(
      'Prompt candidates',
      scored.slice(0, 5).map((c) => ({
        sel: c.sel,
        score: c.score,
        left: Math.round(c.r.left),
        bottom: Math.round(c.r.bottom),
        w: Math.round(c.r.width),
        h: Math.round(c.r.height),
      })),
    )
  }

  return scored[0].el
}

export function getPromptText(el) {
  if (!el) return ''
  if (el instanceof HTMLTextAreaElement) return el.value ?? ''
  return (el.innerText ?? el.textContent ?? '').trim()
}

export function setPromptText(el, text) {
  if (!el) return
  if (el instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    setter.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return
  }

  el.textContent = text
  try {
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
  } catch {
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

export function findSendButton() {
  const host = location.host
  const selectorsByHost = {
    'chatgpt.com': ['button[data-testid="send-button"]', 'button[aria-label*="Send" i]'],
    'claude.ai': ['button[aria-label*="Send" i]', 'button[type="submit"]'],
    'gemini.google.com': ['button[aria-label*="Send" i]', 'button[type="submit"]'],
    'grok.com': ['button[aria-label*="Send" i]', 'button[type="submit"]'],
    'x.ai': ['button[aria-label*="Send" i]', 'button[type="submit"]'],
  }
  const selectors = selectorsByHost[host] ?? ['button[aria-label*="Send" i]', 'button[type="submit"]']
  for (const sel of selectors) {
    const btn = Array.from(document.querySelectorAll(sel)).find(isVisible)
    if (btn) return btn
  }
  return null
}

export function findResponseNodes() {
  const host = location.host
  const selectorsByHost = {
    'chatgpt.com': ['.markdown', '[data-message-author-role]', 'article'],
    'claude.ai': ['article', '.prose', '[data-testid*="message"]'],
    'gemini.google.com': ['.markdown', '.prose', '[role="article"]', '[data-message-id]'],
    'grok.com': ['.markdown', '.prose', '[role="article"]', '[data-message-id]'],
    'x.ai': ['.markdown', '.prose', '[role="article"]', '[data-message-id]'],
  }
  const selectors = selectorsByHost[host] ?? ['.markdown', '.prose', '[role="article"]', 'article']
  const nodes = []
  for (const sel of selectors) document.querySelectorAll(sel).forEach((n) => nodes.push(n))
  return nodes
}

