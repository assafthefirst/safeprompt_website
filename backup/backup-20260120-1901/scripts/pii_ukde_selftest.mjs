import nlp from 'compromise';
import { faker } from '@faker-js/faker';

// Lightweight self-test for UK/DE rules.
// Note: This intentionally tests only the UK/DE-related behavior and the core invariants:
// - same input twice -> same fake
// - restore returns original

function replaceDigitsInString(original, newDigits) {
  let i = 0;
  let out = '';
  for (const ch of original) {
    if (/\d/.test(ch) && i < newDigits.length) out += newDigits[i++];
    else out += ch;
  }
  return out;
}

function fakeUkPostcode() {
  const outward =
    faker.string.alpha({ length: faker.helpers.arrayElement([1, 2]), casing: 'upper' }) +
    faker.string.numeric({ length: 1 }) +
    (faker.datatype.boolean() ? faker.string.alpha({ length: 1, casing: 'upper' }) : '');
  const inward =
    faker.string.numeric({ length: 1 }) +
    faker.string.alpha({ length: 2, casing: 'upper' });
  return `${outward} ${inward}`.replace(/\s+/g, ' ').trim();
}

function fakeUkNino() {
  const letters = 'ABCEGHJKLMNPRSTWXYZ'.split('');
  const suffix = faker.helpers.arrayElement(['A', 'B', 'C', 'D']);
  while (true) {
    const prefix = faker.helpers.arrayElement(letters) + faker.helpers.arrayElement(letters);
    if (['BG', 'GB', 'KN', 'NK', 'NT', 'TN', 'ZZ'].includes(prefix)) continue;
    const digits = faker.string.numeric(6);
    return `${prefix}${digits}${suffix}`;
  }
}

const PII_RULES_UKDE = [
  { name: 'UK Postcode', regex: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, getFake: () => fakeUkPostcode() },
  { name: 'UK NINO', regex: /\b(?!BG)(?!GB)(?!KN)(?!NK)(?!NT)(?!TN)(?!ZZ)[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi, getFake: () => fakeUkNino() },
  { name: 'UK NHS', regex: /\bNHS\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{3}\s?\d{3}\s?\d{4}\b/gi, getFake: (m) => replaceDigitsInString(m, faker.string.numeric(10)) },
  { name: 'UK UTR', regex: /\bUTR\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{3}\s?\d{3}\s?\d{4}\b/gi, getFake: (m) => replaceDigitsInString(m, faker.string.numeric(10)) },
  { name: 'UK Sort Code', regex: /\bsort\s*code\s*[:\-]?\s*\d{2}[- ]?\d{2}[- ]?\d{2}\b/gi, getFake: (m) => replaceDigitsInString(m, faker.string.numeric(6)) },
  { name: 'UK Account', regex: /\baccount\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{8}\b/gi, getFake: (m) => replaceDigitsInString(m, faker.string.numeric(8)) },
  { name: 'DE VAT', regex: /\bDE\s?\d{9}\b/gi, getFake: () => `DE${faker.string.numeric(9)}` },
  { name: 'DE Steuer-ID', regex: /\b(?:Steuer(?:-?ID|identifikationsnummer)|IdNr\.?)\s*[:\-]?\s*\d(?:\s?\d){10}\b/gi, getFake: (m) => replaceDigitsInString(m, faker.string.numeric(11)) },
  { name: 'DE ID/Passport', regex: /\b(?:Personalausweis|Ausweisnummer|Reisepass(?:nummer)?|Passnummer|Pass-?Nr\.?)\s*[:\-]?\s*[A-Z0-9]{8,12}\b/gi, getFake: (m) => m.replace(/[A-Z0-9]{8,12}\b/, faker.string.alphanumeric({ length: 9, casing: 'upper' })) },
  { name: 'DE KVNR', regex: /\b(?:KVNR|Krankenversichertennummer|Versichertennummer)\s*[:\-]?\s*[A-Z]\d{9}\b/gi, getFake: (m) => m.replace(/[A-Z]\d{9}\b/, `${faker.string.alpha({ length: 1, casing: 'upper' })}${faker.string.numeric(9)}`) }
];

function sanitizeUkDe(text, piiMap) {
  let cleanText = String(text ?? '');

  // Names: basic NLP pass
  const doc = nlp(cleanText);
  for (const realName of doc.people().out('array')) {
    if (!realName || realName.length < 3) continue;
    let fakeName = Object.keys(piiMap).find(k => piiMap[k] === realName);
    if (!fakeName) {
      fakeName = faker.person.fullName();
      piiMap[fakeName] = realName;
    }
    cleanText = cleanText.split(realName).join(fakeName);
  }

  // Rules
  for (const rule of PII_RULES_UKDE) {
    cleanText = cleanText.replace(rule.regex, (match) => {
      let fake = Object.keys(piiMap).find(k => piiMap[k] === match);
      if (!fake) {
        fake = rule.getFake.length ? rule.getFake(match) : rule.getFake();
        piiMap[fake] = match;
      }
      return fake;
    });
  }

  return cleanText;
}

function restore(text, piiMap) {
  let out = String(text ?? '');
  const keys = Object.keys(piiMap).sort((a, b) => b.length - a.length);
  for (const fake of keys) out = out.split(fake).join(piiMap[fake]);
  return out;
}

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

const piiMap = {};
const sample = [
  'Dear James Smith, my NINO is QQ 12 34 56 C and my postcode is SW1A 1AA.',
  'NHS number: 943 476 5919, UTR: 123 456 7890.',
  'Sort code: 12-34-56 Account No: 12345678.',
  'DE USt-IdNr: DE123456789, Steuer-ID: 12 345 678 901.',
  'Personalausweis: L01X00T47, KVNR: A123456789.'
].join('\n');

const s1 = sanitizeUkDe(sample, piiMap);
const s2 = sanitizeUkDe(sample, piiMap);
assert(s1 === s2, 'sanitize is stable for the same input (consistency)');

const r1 = restore(s1, piiMap);
assert(r1 === sample, 'restore returns the original text');

console.log('UK/DE selftest passed.');

