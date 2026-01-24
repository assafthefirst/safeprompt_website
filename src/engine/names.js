import nlp from 'compromise'

const COMMON_UK_FIRST_NAMES = new Set([
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'George', 'Edward', 'Henry', 'Jack', 'Oliver', 'Harry', 'Jacob', 'Noah', 'Leo', 'Oscar',
  'Emily', 'Olivia', 'Amelia', 'Isla', 'Ava', 'Ella', 'Sophie', 'Mia', 'Grace', 'Lily',
])

const COMMON_DE_FIRST_NAMES = new Set([
  'Hans', 'Peter', 'Klaus', 'Jürgen', 'Heinz', 'Günter', 'Wolfgang', 'Thomas', 'Michael', 'Stefan',
  'Andreas', 'Christian', 'Markus', 'Matthias', 'Johannes', 'Alexander', 'Daniel', 'Lukas', 'Leon', 'Felix',
  'Anna', 'Laura', 'Julia', 'Lisa', 'Lea', 'Sarah', 'Lena', 'Marie', 'Sophia', 'Hannah',
])

function maybeCommonUkDeFirstName(first) {
  return COMMON_UK_FIRST_NAMES.has(first) || COMMON_DE_FIRST_NAMES.has(first)
}

/**
 * Returns an array of candidate name strings detected in the text.
 * Conservative: filters out very short matches, relies on compromise + a couple heuristics.
 */
export function detectNames(text) {
  const s = String(text ?? '')
  const out = new Set()

  try {
    const doc = nlp(s)
    const people = doc.people().out('array')
    for (const p of people) {
      if (typeof p === 'string' && p.length >= 3) out.add(p)
    }
  } catch {
    // ignore
  }

  const titleNameRegex = /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof|Sir|Lady|Herr|Frau)\.?\s+([A-ZÄÖÜ][a-zA-ZÄÖÜäöüß]+)(?:\s+([A-ZÄÖÜ][a-zA-ZÄÖÜäöüß]+))?\b/g
  for (const m of s.matchAll(titleNameRegex)) {
    const first = m[1]
    const last = m[2]
    if (!first) continue
    if (!maybeCommonUkDeFirstName(first)) continue
    out.add(last ? `${first} ${last}` : first)
  }

  const dearRegex = /\bDear\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g
  for (const m of s.matchAll(dearRegex)) {
    const first = m[1]
    const last = m[2]
    if (!first || !last) continue
    if (!maybeCommonUkDeFirstName(first)) continue
    out.add(`${first} ${last}`)
  }

  return Array.from(out)
}

