import { describe, it, expect } from 'vitest'
import { getOrCreateToken } from '../src/engine/tokens.js'

describe('tokens', () => {
  it('same real value maps to same token', () => {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const t1 = getOrCreateToken('email', 'a@example.com', state)
    const t2 = getOrCreateToken('email', 'a@example.com', state)
    expect(t1).toBe(t2)
    expect(state.tokenToReal[t1]).toBe('a@example.com')
  })

  it('counters increment per type', () => {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const a = getOrCreateToken('phone', '054-9876543', state)
    const b = getOrCreateToken('phone', '054-0000000', state)
    expect(a).toBe('[[SP_PHONE_1]]')
    expect(b).toBe('[[SP_PHONE_2]]')
  })
})

