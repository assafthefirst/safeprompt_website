import { describe, it, expect, beforeEach } from 'vitest'

import { findPromptElement, findSendButton } from '../src/sites/selectors.js'

function setHost(host) {
  Object.defineProperty(window, 'location', {
    value: new URL(`https://${host}/`),
    writable: true,
  })
}

beforeEach(() => {
  document.body.innerHTML = ''
  Element.prototype.getBoundingClientRect = function () {
    return {
      width: 0,
      height: 0,
      left: 0,
      bottom: 0,
      top: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON() {},
    }
  }
})

describe('logged-out no-op expectations (selectors only)', () => {
  it('returns null safely when there is no visible prompt or send button', () => {
    setHost('chatgpt.com')
    document.body.innerHTML = `<div><a href="/login">Login</a></div>`

    expect(findPromptElement()).toBe(null)
    expect(findSendButton()).toBe(null)
  })
})

