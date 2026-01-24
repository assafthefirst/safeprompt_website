import nlp from 'compromise';

// Minimal token self-test (no chrome APIs, no faker dependency).
// Validates:
// - same input twice -> same token
// - restore returns original
// - tokens survive “rewrite” patterns (prefix/suffix around tokens)

function normalizeTokenType(type) {
  return String(type || 'PII').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function makeEngine() {
  const tokenToReal = {};
  const realToToken = {};
  const tokenCounters = {};

  const getOrCreateToken = (type, realValue) => {
    const real = String(realValue ?? '');
    if (!real.trim()) return null;
    const t = normalizeTokenType(type);
    const existing = realToToken[real];
    if (existing) return existing;
    const next = (tokenCounters[t] ?? 0) + 1;
    tokenCounters[t] = next;
    const token = `[[SP_${t}_${next}]]`;
    realToToken[real] = token;
    tokenToReal[token] = real;
    return token;
  };

  const restore = (text) => {
    let out = String(text ?? '');
    const keys = Object.keys(tokenToReal).sort((a, b) => b.length - a.length);
    for (const k of keys) out = out.split(k).join(tokenToReal[k]);
    return out;
  };

  // Very small subset of rules for test
  const RULES = [
    { type: 'EMAIL', regex: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g },
    { type: 'PHONE', regex: /(05[0-9]-?[0-9]{7})/g },
    { type: 'IP', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g }
  ];

  const sanitize = (text) => {
    let clean = String(text ?? '');
    // Names via NLP first
    const people = nlp(clean).people().out('array');
    for (const p of people) {
      if (!p || p.length < 3) continue;
      const tok = getOrCreateToken('NAME', p);
      if (tok) clean = clean.split(p).join(tok);
    }
    for (const r of RULES) {
      clean = clean.replace(r.regex, (m) => getOrCreateToken(r.type, m));
    }
    return clean;
  };

  return { sanitize, restore, tokenToReal, realToToken };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

const engine = makeEngine();

const original = [
  'Dear Garrett Carroll, email Rodger.Emmerich75@gmail.com and call 054-9876543.',
  'Server IP: 192.168.1.1. Repeat IP: 192.168.1.1.'
].join('\n');

const s1 = engine.sanitize(original);
const s2 = engine.sanitize(original);
assert(s1 === s2, 'sanitize is stable (same input -> same tokens)');

const r1 = engine.restore(s1);
assert(r1 === original, 'restore returns original');

// Simulate LLM rewrite: add prefixes/suffixes around tokens
const rewritten = s1.replace(/\[\[SP_NAME_1\]\]/g, 'Mr. [[SP_NAME_1]]').replace(/\[\[SP_PHONE_1\]\]/g, 'Phone: [[SP_PHONE_1]]');
const r2 = engine.restore(rewritten);
assert(r2.includes('Mr. Garrett Carroll'), 'token survives rewrite prefix/suffix for name');
assert(r2.includes('Phone: 054-9876543'), 'token survives rewrite prefix/suffix for phone');

console.log('Token selftest passed.');

