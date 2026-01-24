import { describe, it, expect } from 'vitest'
import { sanitize } from '../src/engine/sanitize.js'
import { restoreText } from '../src/engine/restore.js'

describe('restoreText', () => {
  it('restores original text from tokens', () => {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const input = 'Email Rodger.Emmerich75@gmail.com and call 054-9876543.'
    const { cleanText } = sanitize(input, state, { protectionActive: true })
    const restored = restoreText(cleanText, state.tokenToReal)
    expect(restored).toBe(input)
  })

  it('tokens survive prefix/suffix rewrite patterns', () => {
    const tokenToReal = { '[[SP_NAME_1]]': 'Garrett Carroll', '[[SP_PHONE_1]]': '054-9876543' }
    const rewritten = 'Dear Mr. [[SP_NAME_1]], call Phone: [[SP_PHONE_1]].'
    const restored = restoreText(rewritten, tokenToReal)
    expect(restored).toBe('Dear Mr. Garrett Carroll, call Phone: 054-9876543.')
  })

  it('restores new identifier tokens (e.g., SWIFT) inside punctuation', () => {
    const tokenToReal = { '[[SP_SWIFT_1]]': 'DEUTDEFFXXX' }
    const rewritten = 'SWIFT/BIC: ([[SP_SWIFT_1]]).'
    const restored = restoreText(rewritten, tokenToReal)
    expect(restored).toBe('SWIFT/BIC: (DEUTDEFFXXX).')
  })
})

