import { describe, it, expect } from 'vitest'
import { sanitize, detectPII } from '../src/engine/sanitize.js'

describe('sanitize', () => {
  it('replaces common PII with tokens and is consistent within prompt', () => {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }

    const input =
      'Dear Garrett Carroll, email Rodger.Emmerich75@gmail.com and call 054-9876543. ' +
      'Repeat phone 054-9876543 and IP 192.168.1.1. NINO QQ 12 34 56 C. ' +
      'IPv6 2001:0db8:85a3:0000:0000:8a2e:0370:7334 and MAC 00:1A:2B:3C:4D:5E. ' +
      'SWIFT DEUTDEFFXXX. Routing number: 123456789. Account number: 1234567890. ' +
      'Passport number: 123456789. Driver license: A1B2C3D4. CVV: 123. ' +
      'Company number: 12345678. Handelsregister HRB 12345. EORI: DE1234567890123. ' +
      'VAT ID: FR123456789. GPS 32.0853, 34.7818. ETH 0x52908400098527886E0F7030069857D2E4169EE7. ' +
      'NPI number: 1234567890.'

    const { cleanText, itemsFound } = sanitize(input, state, { protectionActive: true })
    expect(itemsFound).toBeGreaterThan(0)
    expect(cleanText).not.toContain('Rodger.Emmerich75@gmail.com')
    expect(cleanText).not.toContain('054-9876543')
    expect(cleanText).toContain('[[SP_EMAIL_1]]')
    expect(cleanText).toContain('[[SP_PHONE_1]]')

    // Phone appears twice -> same token
    const occurrences = cleanText.split('[[SP_PHONE_1]]').length - 1
    expect(occurrences).toBe(2)

    // State stores originals
    expect(Object.values(state.tokenToReal)).toContain('Rodger.Emmerich75@gmail.com')
    expect(Object.values(state.tokenToReal)).toContain('054-9876543')

    // New identifiers -> token presence (regex match; counters may vary)
    expect(cleanText).toMatch(/\[\[SP_IP6_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_MAC_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_SWIFT_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_ROUTING_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_BANKACCT_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_CVV_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_UKCO_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_DE_REG_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_EORI_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_VAT_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_GEO_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_WALLET_\d+\]\]/)
    expect(cleanText).toMatch(/\[\[SP_NPI_\d+\]\]/)
  })

  it('does not tokenize invalid CC or invalid IBAN, but tokenizes valid ones', () => {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }

    const invalid = 'Card 4111 1111 1111 1112 and IBAN DE89370400440532013001.'
    const outInvalid = sanitize(invalid, state, { protectionActive: true }).cleanText
    expect(outInvalid).not.toMatch(/\[\[SP_CC_\d+\]\]/)
    expect(outInvalid).not.toMatch(/\[\[SP_IBAN_\d+\]\]/)

    const valid = 'Card 4111 1111 1111 1111 and IBAN DE89370400440532013000.'
    const outValid = sanitize(valid, state, { protectionActive: true }).cleanText
    expect(outValid).toMatch(/\[\[SP_CC_\d+\]\]/)
    expect(outValid).toMatch(/\[\[SP_IBAN_\d+\]\]/)
  })

  it('tokenizes and warns on anchored Israeli ID even when checksum is invalid', () => {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const input = 'id -200644338 and phone 0532489583'
    const { cleanText } = sanitize(input, state, { protectionActive: true })
    expect(cleanText).toMatch(/\[\[SP_ID_\d+\]\]/)

    const warn = detectPII(input, { mode: 'warn' })
    expect(warn.detected).toBe(true)
    expect(warn.types).toContain('ID')
  })

  it('tokenizes keyword-anchored credit card (bypasses Luhn)', () => {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const input = 'Credit Card Number: 4539 8214 7753 2196'
    const { cleanText, itemsFound } = sanitize(input, state, { protectionActive: true })
    expect(itemsFound).toBeGreaterThan(0)
    expect(cleanText).toMatch(/\[\[SP_CC_ANCHOR_\d+\]\]/)
    expect(cleanText).not.toContain('4539 8214 7753 2196')
  })

  it('detects and warns on keyword-anchored credit card', () => {
    const warn = detectPII('Credit Card Number: 4539 8214 7753 2196', { mode: 'warn' })
    expect(warn.detected).toBe(true)
  })

  it('tokenizes Health Insurance Member ID (HIX pattern)', () => {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const input = 'Health Insurance Member ID: HIX-784392651'
    const { cleanText, itemsFound } = sanitize(input, state, { protectionActive: true })
    expect(itemsFound).toBeGreaterThan(0)
    expect(cleanText).toMatch(/\[\[SP_INSURANCE_\d+\]\]/)
    expect(cleanText).not.toContain('HIX-784392651')
  })

  it('tokenizes bare HIX/HIN/MBI patterns', () => {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const input = 'member code HIX-784392651 and MBI-1234567890'
    const { cleanText } = sanitize(input, state, { protectionActive: true })
    expect(cleanText).toMatch(/\[\[SP_INSURANCE_\d+\]\]/)
  })

  it('tokenizes Driver License with state prefix', () => {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const input = "Driver's License: TX K4827319"
    const { cleanText, itemsFound } = sanitize(input, state, { protectionActive: true })
    expect(itemsFound).toBeGreaterThan(0)
    expect(cleanText).toMatch(/\[\[SP_DL_\d+\]\]/)
  })

  it('tokenizes US Home Address (structural)', () => {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const input = 'My address is 2741 Westbrook Drive, Dallas, TX 75214 please update records.'
    const { cleanText, itemsFound } = sanitize(input, state, { protectionActive: true })
    expect(itemsFound).toBeGreaterThan(0)
    expect(cleanText).toMatch(/\[\[SP_ADDRESS_\d+\]\]/)
    expect(cleanText).not.toContain('2741 Westbrook Drive')
  })

  it('warns on US Home Address in warn mode', () => {
    const warn = detectPII('Send mail to 2741 Westbrook Drive, Dallas, TX 75214', { mode: 'warn' })
    expect(warn.detected).toBe(true)
    expect(warn.types).toContain('ADDRESS')
  })
})

