import { detectNames } from './names.js'
import { getOrCreateToken } from './tokens.js'
import { PII_RULES } from './rules.js'

const ANCHORED_ISRAELI_ID_REGEX =
  /((?:ת["״]?\s*ז|תעודת\s*זהות|tz|teudat|zehut|israeli\s*id|id(?:\s*number)?))\s*[:#-]?\s*(\d{9})/gi

function digitsOnly(s) {
  return String(s ?? '').replace(/\D+/g, '')
}

export function isValidCreditCard(candidate) {
  const d = digitsOnly(candidate)
  if (d.length < 13 || d.length > 19) return false
  // Luhn check
  let sum = 0
  let alt = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48
    if (n < 0 || n > 9) return false
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

// Minimal IBAN checksum validation (MOD-97)
// - strips spaces
// - converts letters A=10..Z=35
// - valid if remainder == 1
export function isValidIBAN(candidate) {
  const raw = String(candidate ?? '')
    .toUpperCase()
    .replace(/\s+/g, '')
  if (!/^[A-Z0-9]+$/.test(raw)) return false
  if (raw.length < 15 || raw.length > 34) return false
  // Must start with country code + 2 check digits
  if (!/^[A-Z]{2}\d{2}/.test(raw)) return false

  const rearranged = raw.slice(4) + raw.slice(0, 4)
  let remainder = 0

  for (const ch of rearranged) {
    let block
    const code = ch.charCodeAt(0)
    if (code >= 48 && code <= 57) block = ch
    else if (code >= 65 && code <= 90) block = String(code - 55) // A->10
    else return false

    for (const digitChar of block) {
      const digit = digitChar.charCodeAt(0) - 48
      remainder = (remainder * 10 + digit) % 97
    }
  }
  return remainder === 1
}

// Israeli ID (Teudat Zehut) checksum validation (9 digits)
// https://en.wikipedia.org/wiki/Israeli_identity_card#ID_number_structure
export function isValidIsraeliId(candidate) {
  const d = digitsOnly(candidate).padStart(9, '0')
  if (!/^\d{9}$/.test(d)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let n = d.charCodeAt(i) - 48
    const factor = i % 2 === 0 ? 1 : 2
    n *= factor
    if (n > 9) n = Math.floor(n / 10) + (n % 10)
    sum += n
  }
  return sum % 10 === 0
}

export function sanitize(text, state, { protectionActive } = {}) {
  if (protectionActive === false) return { cleanText: text, itemsFound: 0 }

  const original = typeof text === 'string' ? text : (text == null ? '' : String(text))
  let cleanText = original
  let itemsFound = 0

  // Structured fields: "full_name": "..."
  const structuredFullNameRegex = /("full[_-]?name"\s*:\s*")([^"\n\r]{3,100})(")/gi
  cleanText = cleanText.replace(structuredFullNameRegex, (match, prefix, realName, suffix) => {
    const tok = getOrCreateToken('NAME', realName.trim(), state)
    if (!tok) return match
    itemsFound++
    return `${prefix}${tok}${suffix}`
  })

  // Names first (compromise + heuristics)
  for (const realName of detectNames(original)) {
    if (!realName || realName.length < 3) continue
    const tok = getOrCreateToken('NAME', realName, state)
    if (!tok) continue
    if (cleanText.includes(realName)) {
      cleanText = cleanText.split(realName).join(tok)
      itemsFound++
    }
  }

  // Israeli ID fallback in anchored contexts:
  // even if checksum fails, if user explicitly labels the value as an ID we still tokenize it.
  // This keeps Secure Send behavior practical for real-world messy input.
  cleanText = cleanText.replace(ANCHORED_ISRAELI_ID_REGEX, (match, anchor, idDigits) => {
    const tok = getOrCreateToken('ID', idDigits, state)
    if (!tok) return match
    itemsFound++
    return match.replace(idDigits, tok)
  })

  // Regex rules -> tokens
  for (const rule of PII_RULES) {
    cleanText = cleanText.replace(rule.regex, (match, ...args) => {
      // Validate-only tokenization for certain high-FP types
      if (rule.type === 'CC' && !isValidCreditCard(match)) return match
      if (rule.type === 'IBAN' && !isValidIBAN(match)) return match
      if (rule.type === 'ID' && rule.name?.includes?.('Israeli ID') && !isValidIsraeliId(match)) return match

      const captureGroup = rule.captureGroup
      if (captureGroup && typeof args[captureGroup - 1] === 'string') {
        const captured = args[captureGroup - 1]
        const tok = getOrCreateToken(rule.type, captured, state)
        itemsFound++
        return match.replace(captured, tok)
      }

      const tok = getOrCreateToken(rule.type, match, state)
      itemsFound++
      return tok
    })
  }

  return { cleanText, itemsFound }
}

export function detectPII(text, { mode = 'warn' } = {}) {
  const s = String(text ?? '')
  if (!s.trim()) return { detected: false, reasons: [] }

  const reasons = []
  const typesSet = new Set()

  // Fast guard: for plain English sentences with no typical PII signals, skip heavy checks.
  // This reduces false positives in warn-only flow without impacting Secure Send behavior.
  const hasDigits = /\d/.test(s)
  const hasAt = s.includes('@')
  const hasColon = s.includes(':')
  const hasPIIKeywords = /\b(iban|swift|bic|passport|cvv|cvc|routing|aba|ach|account|acct|eori|vat|nino|nhs|utr|postcode|ip|ipv6|mac|key|token|ssn|ein)\b/i.test(s)

  const names = detectNames(s)
  // Conservative: only treat names as PII signal for warnings if they look like a full name.
  if (names.some((n) => typeof n === 'string' && n.includes(' '))) {
    reasons.push('Name')
    typesSet.add('NAME')
  }

  if (mode === 'warn' && !hasDigits && !hasAt && !hasColon && !hasPIIKeywords && reasons.length === 0) {
    return { detected: false, reasons: [], types: [] }
  }

  if (/"full[_-]?name"\s*:\s*"[^"\n\r]{3,100}"/i.test(s)) {
    reasons.push('full_name')
    typesSet.add('NAME')
  }

  const exampleContext =
    mode === 'warn' &&
    /\b(example|sample|demo|rfc|documentation|docs|test data|dummy|placeholder|for testing|unit test|hash|checksum|signature|digest)\b/i.test(s)

  const hasNetKeyword = /\b(ipv4|ipv6|ip address|mac|gps|coordinates|wallet|ethereum)\b/i.test(s)
  const hasDobAnchor = /\b(dob|date of birth|birth|born|תאריך לידה)\b/i.test(s)
  const hasPostcodeAnchor = /\b(postcode|address|zip|כתובת|מיקוד)\b/i.test(s)
  // Hebrew/English TZ anchors (avoid \\b with Hebrew + quote characters)
  const hasTzAnchor =
    /(?:^|[^A-Za-z0-9])(?:ת["״]?ז|tz|teudat|zehut|israeli\s*id|id\s*number)(?=$|[^A-Za-z0-9])/i.test(s)
  const hasAnchoredIsraeliId = ANCHORED_ISRAELI_ID_REGEX.test(s)
  ANCHORED_ISRAELI_ID_REGEX.lastIndex = 0
  const hasNegatedWallet = /\bnot\s+(?:a\s+)?wallet\b/i.test(s) || /\bnot\s+(?:an?\s+)?ethereum\b/i.test(s)
  const hasNegatedPostcode = /\bnot\s+(?:an?\s+)?(?:address|postcode|zip)\b/i.test(s) || /\bnot\s+an?\s+address\b/i.test(s)
  const hasNegatedDob = /\bnot\s+(?:a\s+)?dob\b/i.test(s) || /\bnot\s+birth\s+dates?\b/i.test(s) || /\bnot\s+date\s+of\s+birth\b/i.test(s)

  function hasAnyValidMatch(rule, validator) {
    const flags = rule.regex.flags.includes('g') ? rule.regex.flags : rule.regex.flags + 'g'
    const re = new RegExp(rule.regex.source, flags)
    let m
    while ((m = re.exec(s))) {
      if (validator(m[0])) return true
    }
    return false
  }

  for (const rule of PII_RULES) {
    try {
      rule.regex.lastIndex = 0
      // Warn-mode hardening (do not change sanitize behavior):
      if (mode === 'warn') {
        // SWIFT/BIC is already keyword-anchored at the rule level.

        // IBAN: require keyword to avoid SKU-like collisions.
        if (rule.type === 'IBAN' && !/\bIBAN\b/i.test(s)) continue

        // TZ (9 digits): require keyword anchor in warn mode.
        if (rule.type === 'ID' && rule.name.includes('Israeli ID')) {
          if (!hasTzAnchor && !hasAnchoredIsraeliId) continue
          if (!hasAnyValidMatch(rule, isValidIsraeliId) && !hasAnchoredIsraeliId) continue
          reasons.push(rule.name)
          typesSet.add(rule.type)
          continue
        }

        // US/Intl phone: require format cues (not just digits).
        if (rule.name === 'US/Intl Phone' && !/[+\-\(\)\.\s]/.test(s)) continue

        // DOB: only warn if explicitly anchored (avoid project timelines)
        if (rule.type === 'DOB' && (!hasDobAnchor || hasNegatedDob)) continue

        // UK Postcode: only warn if anchored (avoid story clues)
        if (rule.type === 'POSTCODE' && (!hasPostcodeAnchor || hasNegatedPostcode)) continue

        // Suppress common “example” context for network/geo/wallet unless the prompt explicitly mentions it.
        // Also suppress when the user explicitly says "not a wallet".
        if (exampleContext && (!hasNetKeyword || hasNegatedWallet)) {
          if (rule.type === 'IP' || rule.type === 'IP6' || rule.type === 'MAC' || rule.type === 'GEO' || rule.type === 'WALLET') continue
        }

        // CC / IBAN: validate before warning (reduce numeric/SKU collisions)
        if (rule.type === 'CC') {
          if (!hasAnyValidMatch(rule, isValidCreditCard)) continue
          reasons.push(rule.name)
          typesSet.add(rule.type)
          continue
        }
        if (rule.type === 'IBAN') {
          if (!hasAnyValidMatch(rule, isValidIBAN)) continue
          reasons.push(rule.name)
          typesSet.add(rule.type)
          continue
        }
      }

      if (rule.regex.test(s)) {
        reasons.push(rule.name)
        typesSet.add(rule.type)
      }
    } catch {
      // ignore
    }
  }

  return { detected: reasons.length > 0, reasons: Array.from(new Set(reasons)), types: Array.from(typesSet) }
}

