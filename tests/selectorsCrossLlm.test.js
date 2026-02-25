import { describe, it, expect, beforeEach } from 'vitest'

import { FIXTURES } from './fixtures/site_fixtures.js'
import { findPromptElement, findSendButton, findResponseNodes, hasComposer } from '../src/sites/selectors.js'

function setHost(host) {
  Object.defineProperty(window, 'location', {
    value: new URL(`https://${host}/`),
    writable: true,
  })
}

function mockRects() {
  // happy-dom returns 0 sizes by default; our code filters by visibility.
  Element.prototype.getBoundingClientRect = function () {
    const style = this.getAttribute('style') || ''
    const w = /width:\s*(\d+)/.exec(style)?.[1]
    const h = /height:\s*(\d+)/.exec(style)?.[1]
    const left = /left:\s*(\d+)/.exec(style)?.[1]
    const bottom = /bottom:\s*(\d+)/.exec(style)?.[1]
    return {
      width: w ? Number(w) : 500,
      height: h ? Number(h) : 40,
      left: left ? Number(left) : 200,
      bottom: bottom ? Number(bottom) : 900,
      top: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON() {},
    }
  }
}

beforeEach(() => {
  document.body.innerHTML = ''
  mockRects()
})

const CASES = [
  { key: 'chatgpt', host: 'chatgpt.com' },
  { key: 'gemini', host: 'gemini.google.com' },
  { key: 'claude', host: 'claude.ai' },
  { key: 'grok', host: 'x.ai' }, // grok selectors cover x.ai
  { key: 'copilot', host: 'copilot.microsoft.com' }, // falls back to generic
  { key: 'deepseek', host: 'chat.deepseek.com' }, // falls back to generic
]

describe('selectors cross-LLM (logged-in/out fixtures)', () => {
  for (const c of CASES) {
    it(`${c.key} logged-in: finds prompt, send button, and responses`, () => {
      setHost(c.host)
      document.body.innerHTML = FIXTURES[c.key].loggedIn

      const prompt = findPromptElement()
      expect(prompt).toBeTruthy()

      const send = findSendButton()
      expect(send).toBeTruthy()

      const nodes = findResponseNodes()
      expect(Array.isArray(nodes)).toBe(true)
      expect(nodes.length).toBeGreaterThan(0)

      expect(hasComposer()).toBe(true)
    })

    it(`${c.key} logged-out: safe nulls/empties`, () => {
      setHost(c.host)
      document.body.innerHTML = FIXTURES[c.key].loggedOut

      const prompt = findPromptElement()
      expect(prompt).toBe(null)

      const send = findSendButton()
      expect(send).toBe(null)

      const nodes = findResponseNodes()
      expect(Array.isArray(nodes)).toBe(true)
      // could be empty or contain landing content; we just require no crash

      expect(hasComposer()).toBe(false)
    })
  }
})

