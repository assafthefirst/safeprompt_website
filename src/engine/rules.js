// Order matters: Specific/Long patterns first, Generic/Short patterns last.
export const PII_RULES = [
  // Secrets / Credentials
  {
    name: 'Private Key Block (PEM)',
    type: 'SECRET',
    regex: /-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g,
  },
  {
    name: 'JWT Token',
    type: 'SECRET',
    regex: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
  },
  { name: 'AWS Access Key ID', type: 'SECRET', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'Google API Key', type: 'SECRET', regex: /\bAIza[0-9A-Za-z\-_]{30,}\b/g },
  { name: 'GitHub Token', type: 'SECRET', regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g },
  { name: 'Slack Token', type: 'SECRET', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: 'Stripe Secret Key', type: 'SECRET', regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g },

  // Common
  { name: 'Email', type: 'EMAIL', regex: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi },

  // Trade / customs / tax (keyword anchored; placed before IBAN to avoid collisions)
  { name: 'EU EORI Number (keyword anchored)', type: 'EORI', regex: /\bEORI\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*[A-Z]{2}[A-Z0-9]{8,15}\b/gi },
  {
    name: 'EU VAT ID (generic non-DE) (keyword anchored)',
    type: 'VAT',
    regex: /\b(?:VAT|VAT\s*ID|VATIN)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*(?!DE)[A-Z]{2}[A-Z0-9]{6,12}\b/gi,
  },

  // Bank
  { name: 'IBAN (EU Bank)', type: 'IBAN', regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g },

  // Network / device identifiers (high-signal)
  { name: 'Ethereum Wallet Address', type: 'WALLET', regex: /\b0x[a-fA-F0-9]{40}\b/g },
  { name: 'MAC Address', type: 'MAC', regex: /\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi },
  {
    name: 'IPv6 Address',
    type: 'IP6',
    // Conservative: either contains a 3-4 hex group, or contains '::' (compressed form).
    regex: /\b(?:(?=[A-F0-9:]*[A-F0-9]{3,4})(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}|(?=[A-F0-9:]*::)(?:[A-F0-9]{0,4}:){1,7}[A-F0-9]{0,4})\b/gi,
  },

  // Financial identifiers (non-card)
  // Keyword-anchored to avoid false positives on plain English words (e.g., "generate").
  {
    name: 'SWIFT/BIC (keyword anchored)',
    type: 'SWIFT',
    captureGroup: 1,
    regex: /\b(?:SWIFT\/BIC|BIC\/SWIFT|SWIFT|BIC)(?:\s*(?:code|number|no\.?|#|id))?\s*[:\-]?\s*([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/gi,
  },
  {
    name: 'US Routing (ABA/ACH) (keyword anchored)',
    type: 'ROUTING',
    regex: /\b(?:routing|aba|ach)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{9}\b/gi,
  },
  {
    name: 'Bank Account Number (keyword anchored)',
    type: 'BANKACCT',
    regex: /\b(?:account\s*(?:number|no\.?)|acct\.?)\s*[:\-]?\s*\d{6,12}\b/gi,
  },

  // UK identifiers
  {
    name: 'UK Postcode',
    type: 'POSTCODE',
    // Canonical-ish UK postcode (incl. GIR 0AA), stricter to reduce false positives.
    regex: /\b(?:GIR\s?0AA|(?:(?:[A-Z][0-9]{1,2})|(?:[A-Z][A-HJ-Y][0-9]{1,2})|(?:[A-Z][0-9][A-Z])|(?:[A-Z][A-HJ-Y][0-9][A-Z])|(?:[A-Z][A-HJ-Y][0-9]{2}))\s?[0-9][A-Z]{2})\b/gi,
  },
  {
    name: 'UK NINO (National Insurance Number)',
    type: 'NINO',
    regex: /\b(?!BG)(?!GB)(?!KN)(?!NK)(?!NT)(?!TN)(?!ZZ)[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi,
  },
  { name: 'UK NHS Number (keyword anchored)', type: 'NHS', regex: /\bNHS\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{3}\s?\d{3}\s?\d{4}\b/gi },
  { name: 'UK UTR (keyword anchored)', type: 'UTR', regex: /\bUTR\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{3}\s?\d{3}\s?\d{4}\b/gi },
  { name: 'UK Sort Code (keyword anchored)', type: 'SORTCODE', regex: /\bsort\s*code\s*[:\-]?\s*\d{2}[- ]?\d{2}[- ]?\d{2}\b/gi },
  { name: 'UK Account Number (keyword anchored)', type: 'ACCOUNT', regex: /\baccount\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{8}\b/gi },
  {
    name: 'UK Company Registration Number (keyword anchored)',
    type: 'UKCO',
    regex: /\b(?:company\s*(?:reg(?:istration)?|number)|crn)\s*[:\-]?\s*(?:\d{8}|[A-Z]{2}\d{6})\b/gi,
  },

  // Germany (DE) identifiers
  { name: 'DE VAT ID (USt-IdNr)', type: 'VAT', regex: /\bDE\s?\d{9}\b/gi },
  {
    name: 'DE Steuer-ID (keyword anchored)',
    type: 'TAXID',
    regex: /\b(?:Steuer(?:-?ID|identifikationsnummer)|IdNr\.?)\s*[:\-]?\s*\d(?:\s?\d){10}\b/gi,
  },
  {
    name: 'DE Personalausweis/Reisepass (keyword anchored)',
    type: 'PASSPORT',
    regex: /\b(?:Personalausweis|Ausweisnummer|Reisepass(?:nummer)?|Passnummer|Pass-?Nr\.?)\s*[:\-]?\s*[A-Z0-9]{8,12}\b/gi,
  },
  {
    name: 'DE Health Insurance (KVNR) (keyword anchored)',
    type: 'INSURANCE',
    regex: /\b(?:KVNR|Krankenversichertennummer|Versichertennummer)\s*[:\-]?\s*[A-Z]\d{9}\b/gi,
  },
  {
    name: 'DE Address (street + house + PLZ)',
    type: 'ADDRESS',
    regex: /\b[A-ZÄÖÜ][\wÄÖÜäöüß.-]+(?:\s+[A-ZÄÖÜ][\wÄÖÜäöüß.-]+){0,4}\s+(?:Straße|Str\.|Weg|Platz|Allee|Gasse|Ring|Damm)\s+\d{1,4}[a-zA-Z]?(?:,\s*)?\d{5}\s+[A-ZÄÖÜ][\wÄÖÜäöüß.-]+\b/g,
  },
  {
    name: 'DE Handelsregister (HRB/HRA) (keyword anchored)',
    type: 'DE_REG',
    regex: /\b(?:handelsregister|hrb|hra)\s*(?:nr\.?|number|no\.?|#|id)?\s*[:\-]?\s*(?:hrb|hra)?\s*\d{1,6}\b/gi,
  },

  // Financial / IDs
  { name: 'Credit Card', type: 'CC', regex: /\b(?:\d[ -]*?){13,19}\b/g },
  { name: 'Card CVV/CVC (keyword anchored)', type: 'CVV', regex: /\b(?:cvv|cvc|cid)\s*[:\-]?\s*\d{3,4}\b/gi },
  { name: 'US SSN', type: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: 'US EIN (Tax ID)', type: 'EIN', regex: /\b\d{2}-\d{7}\b/g },
  { name: 'US NPI (keyword anchored)', type: 'NPI', regex: /\bNPI\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{10}\b/gi },

  // Dates (DOB formats)
  { name: 'DOB (YYYY-MM-DD)', type: 'DOB', regex: /\b\d{4}-\d{2}-\d{2}\b/g },
  { name: 'DOB (MM/DD/YYYY)', type: 'DOB', regex: /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}\b/g },
  { name: 'DOB (DD/MM/YYYY)', type: 'DOB', regex: /\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/\d{4}\b/g },
  {
    name: 'GPS Coordinates (lat,long)',
    type: 'GEO',
    regex: /\b-?(?:[0-8]?\d(?:\.\d+)?|90(?:\.0+)?)\s*,\s*-?(?:1[0-7]\d(?:\.\d+)?|0?\d?\d(?:\.\d+)?|180(?:\.0+)?)\b/g,
  },

  // Network
  {
    name: 'IPv4 Address',
    type: 'IP',
    regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  },

  // IL
  { name: 'Israeli ID (TZ)', type: 'ID', regex: /\b\d{9}\b/g },
  { name: 'Israeli Phone', type: 'PHONE', regex: /\b(05[0-9]-?[0-9]{7})\b/g },

  // Phones
  { name: 'US/Intl Phone', type: 'PHONE', regex: /\b\+?1?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },

  // Passport (general) - keyword anchored to reduce collisions with random alphanumerics
  {
    name: 'Passport (General) (keyword anchored)',
    type: 'PASSPORT',
    captureGroup: 1,
    regex: /\b(?:passport|pass)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*([A-Z]{1,2}\d{6,9})\b/gi,
  },
  {
    name: 'US Passport Number (keyword anchored)',
    type: 'PASSPORT',
    regex: /\bpassport\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{9}\b/gi,
  },
  {
    name: "US Driver's License (keyword anchored)",
    type: 'DL',
    regex: /\b(?:driver'?s\s*license|driving\s*license|dl)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*[A-Z0-9]{6,12}\b/gi,
  },

  // Keyword-anchored IDs
  {
    name: 'Case/Client/Patient/Invoice ID',
    type: 'CASEID',
    regex: /\b(?:case|matter|file|client|patient|mrn|invoice|claim|ticket)\s*(?:#|no\.|number|id)?\s*[:\-]?\s*[A-Z0-9][A-Z0-9\-_/]{3,}\b/gi,
  },
]

