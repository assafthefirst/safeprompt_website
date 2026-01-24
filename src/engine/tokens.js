export function normalizeTokenType(type) {
  return String(type || 'PII')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * state: { tokenToReal: Record<string,string>, realToToken: Record<string,string>, tokenCounters: Record<string,number> }
 */
export function getOrCreateToken(type, realValue, state) {
  const real = String(realValue ?? '')
  if (!real.trim()) return null

  const t = normalizeTokenType(type)
  const existing = state.realToToken[real]
  if (existing) return existing

  const next = (state.tokenCounters[t] ?? 0) + 1
  state.tokenCounters[t] = next

  const token = `[[SP_${t}_${next}]]`
  state.realToToken[real] = token
  state.tokenToReal[token] = real
  return token
}

