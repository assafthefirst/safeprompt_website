import { describe, it, expect } from 'vitest'
import { detectPII, sanitize } from '../src/engine/sanitize.js'

describe('false positives', () => {
  it('does not flag plain English prompt like "generate the video"', () => {
    const res = detectPII('generate the video i asked you')
    expect(res.detected).toBe(false)
  })

  it('warn-mode does not flag invalid credit card sequences (Luhn)', () => {
    const res = detectPII('Card: 4111 1111 1111 1112', { mode: 'warn' })
    expect(res.detected).toBe(false)
  })

  it('still flags true SWIFT/BIC when keyword is present', () => {
    const res = detectPII('SWIFT: DEUTDEFFXXX', { mode: 'warn' })
    expect(res.detected).toBe(true)
    expect(res.reasons.join(' ')).toMatch(/SWIFT/i)

    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const { cleanText } = sanitize('SWIFT: DEUTDEFFXXX', state, { protectionActive: true })
    // keep label, replace code
    expect(cleanText).toContain('SWIFT')
    expect(cleanText).toMatch(/\[\[SP_SWIFT_\d+\]\]/)
  })

  it('warn-mode does not flag SKU-like strings as IBAN without IBAN keyword', () => {
    const res = detectPII('Create SKUs: AB1234567, CD9876543', { mode: 'warn' })
    expect(res.detected).toBe(false)
  })

  it('warn-mode suppresses RFC/example network data when described as example', () => {
    const res = detectPII('These are documentation examples: 192.0.2.10 2001:db8::1 00:11:22:33:44:55', { mode: 'warn' })
    expect(res.detected).toBe(false)
  })

  it('warn-mode suppresses wallet-like 0x... when described as a hash', () => {
    const res = detectPII('Analyze this as a hash: 0x52908400098527886E0F7030069857D2E4169EE7', { mode: 'warn' })
    expect(res.detected).toBe(false)
  })

  it('warn-mode does not treat project dates as DOB without DOB anchors', () => {
    const res = detectPII('Project timeline: 2026-02-01, 2026-02-15, 2026-03-01', { mode: 'warn' })
    expect(res.detected).toBe(false)
  })

  it('warn-mode does not flag UK postcode inside story text without postcode/address anchor', () => {
    const res = detectPII('In a puzzle story, the code SW1A 1AA appears as a clue.', { mode: 'warn' })
    expect(res.detected).toBe(false)
  })
})

