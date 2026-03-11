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
  // Standard IBAN (no spaces/hyphens)
  { name: 'IBAN (EU Bank)', type: 'IBAN', regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g },
  // Keyword-anchored IBAN with hyphens/spaces (DEMO-IBAN-DE-7721-4419-8800)
  // IBAN_ANCHOR type bypasses isValidIBAN since keyword confirms intent
  {
    name: 'IBAN (keyword anchored, hyphenated)',
    type: 'IBAN_ANCHOR',
    regex: /\bIBAN\s*[:\-]?\s*[A-Z]{2}[\s\-]?\d{2}(?:[\s\-]?[A-Z0-9]{1,8}){1,8}\b/gi,
  },

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

  // --- France ---
  {
    name: 'French NIR (keyword anchored)',
    type: 'NIR',
    regex: /\b(?:NIR|num[ée]ro\s*(?:de\s*)?s[ée]curit[ée]\s*sociale|s[ée]curit[ée]\s*sociale|social\s*security)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/gi,
  },
  {
    name: 'French CNI (keyword anchored)',
    type: 'NATID',
    regex: /\b(?:carte\s*(?:nationale\s*)?d[''\s]?identit[ée]|CNI|french\s*(?:national\s*)?id)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*[A-Z0-9]{10,12}\b/gi,
  },

  // --- Spain ---
  {
    name: 'Spanish DNI (keyword anchored)',
    type: 'NATID',
    captureGroup: 1,
    regex: /\b(?:DNI|documento\s*nacional|spanish\s*(?:national\s*)?id)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*(\d{8}[A-Z])\b/gi,
  },
  {
    name: 'Spanish NIE (keyword anchored)',
    type: 'NATID',
    captureGroup: 1,
    regex: /\b(?:NIE|n[uú]mero\s*de\s*identidad\s*de\s*extranjero|foreigner\s*id)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*([XYZ]\d{7}[A-Z])\b/gi,
  },

  // --- Italy ---
  {
    name: 'Italian Codice Fiscale (keyword anchored)',
    type: 'NATID',
    regex: /\b(?:codice\s*fiscale|CF|fiscal\s*code|italian\s*tax\s*(?:code|id))\s*[:\-]?\s*[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]\b/gi,
  },
  {
    name: 'Italian Partita IVA (keyword anchored)',
    type: 'VAT',
    regex: /\b(?:partita\s*IVA|P\.?\s*IVA|italian\s*vat)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*(?:IT)?\d{11}\b/gi,
  },

  // --- Belgium ---
  {
    name: 'Belgian National Number (keyword anchored)',
    type: 'NATID',
    regex: /\b(?:rijksregisternummer|national\s*(?:register\s*)?number|belgian\s*(?:national\s*)?(?:number|id)|nn)\s*[:\-]?\s*\d{2}[.\s]?\d{2}[.\s]?\d{2}[.\s-]?\d{3}[.\s]?\d{2}\b/gi,
  },

  // --- Netherlands ---
  {
    name: 'Dutch BSN (keyword anchored)',
    type: 'NATID',
    regex: /\b(?:BSN|burgerservicenummer|burger\s*service\s*nummer|dutch\s*(?:citizen\s*)?(?:number|id)|sofi\s*nummer)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{9}\b/gi,
  },

  // --- Brazil ---
  // CPF: 000.000.000-00 or 00000000000
  {
    name: 'Brazilian CPF',
    type: 'NATID',
    regex: /\b(?:CPF|cadastro\s*(?:de\s*)?pessoa\s*f[íi]sica)\s*[:\-]?\s*\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}\b/gi,
  },
  // CPF structural (keyword-less, with dots/dash separators only)
  {
    name: 'Brazilian CPF (structural)',
    type: 'NATID',
    regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
  },
  // CNPJ: 00.000.000/0000-00
  {
    name: 'Brazilian CNPJ',
    type: 'NATID',
    regex: /\b(?:CNPJ|cadastro\s*nacional\s*(?:de\s*)?pessoa\s*jur[íi]dica)?\s*\d{2}\.?\d{3}\.?\d{3}\/?\.?\d{4}[-.]?\d{2}\b/gi,
  },
  // Brazilian RG (identity, keyword anchored)
  {
    name: 'Brazilian RG (keyword anchored)',
    type: 'NATID',
    regex: /\b(?:RG|registro\s*geral|identidade)\s*[:\-]?\s*\d{1,2}\.?\d{3}\.?\d{3}[-]?\d{1}\b/gi,
  },

  // --- USA additional ---
  {
    name: 'VIN (keyword anchored)',
    type: 'VIN',
    regex: /\b(?:VIN|vehicle\s*identification\s*(?:number|no\.?|#))\s*[:\-]?\s*([A-HJ-NPR-Z0-9]{17})\b/gi,
    captureGroup: 1,
  },
  {
    name: 'DEA Number (keyword anchored)',
    type: 'DEA',
    regex: /\b(?:DEA|drug\s*enforcement)\s*(?:number|no\.?|#|id|reg(?:istration)?)?\s*[:\-]?\s*[A-Z]{2}\d{7}\b/gi,
  },
  {
    name: 'Medicare Beneficiary ID (keyword anchored)',
    type: 'INSURANCE',
    regex: /\b(?:medicare|MBI)\s*(?:beneficiary\s*)?(?:ID|number|no\.?|#)?\s*[:\-]?\s*\d[A-Z][A-Z0-9]\d[-]?[A-Z][A-Z0-9]\d[-]?[A-Z]{2}\d{2}\b/gi,
  },
  {
    name: 'US License Plate (keyword anchored)',
    type: 'PLATE',
    regex: /\b(?:license\s*plate|plate\s*(?:number|no\.?|#)|registration\s*(?:number|no\.?|plate))\s*[:\-]?\s*[A-Z0-9]{2,4}[-\s]?[A-Z0-9]{2,5}\b/gi,
  },

  // --- UK additional ---
  {
    name: 'UK Driving Licence (keyword anchored)',
    type: 'DL',
    regex: /\b(?:driving\s*licen[cs]e|driver'?s?\s*licen[cs]e|DVLA)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*[A-Z]{1,5}\d{6,7}[A-Z0-9]{0,8}\b/gi,
  },

  // --- Generic keyword-anchored national / tax IDs (catch-all for labelled data) ---
  {
    name: 'Tax ID (generic keyword anchored)',
    type: 'TAXID',
    regex: /\b(?:tax\s*(?:id(?:entification)?|number|no\.?|#|code)|taxpayer\s*(?:id|number)|TIN|ITIN)\s*[:\-]?\s*[A-Z0-9][\w\-]{5,15}\b/gi,
  },
  {
    name: 'National ID (generic keyword anchored)',
    type: 'NATID',
    regex: /\b(?:national\s*(?:id(?:entity)?|identification)\s*(?:number|no\.?|#|card)?|citizen\s*(?:id|number)|personal\s*(?:id|number))\s*[:\-]?\s*[A-Z0-9][\w\-]{5,18}\b/gi,
  },

  // Financial / IDs
  // Keyword-anchored CC: bypasses Luhn when explicitly labelled (e.g. "credit card: 4539 8214 ...")
  {
    name: 'Credit Card (keyword anchored)',
    type: 'CC_ANCHOR',
    regex: /\b(?:credit\s*card|card\s*number|card\s*no\.?|card\s*#|cc\s*(?:number|no\.?|#)?)\s*[:\-]?\s*(\d(?:[\s-]*\d){12,18})\b/gi,
    captureGroup: 1,
  },
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
  // US/Canada: +1 (optional), then 10 digits
  { name: 'US/Canada Phone', type: 'PHONE', regex: /\b\+?1?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  // International phones with country code: +CC followed by 6-14 digits with separators
  // Covers EU (+49, +33, +44, +34, +39, +31, +32, +48, etc.) and Brazil (+55)
  {
    name: 'International Phone (with country code)',
    type: 'PHONE',
    regex: /\+(?:49|33|44|34|39|31|32|48|351|353|358|45|46|47|41|43|30|36|420|421|55|52|54|56|57|58|51)\s?[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{2,5}[\s.\-]?\d{2,9}\b/g,
  },
  // Brazilian phone: (XX) 9XXXX-XXXX or (XX) XXXX-XXXX
  {
    name: 'Brazilian Phone',
    type: 'PHONE',
    regex: /(?:\(\d{2}\)|\b\d{2})\s*(?:9\d{4}|\d{4})[-\s]?\d{4}\b/g,
  },

  // Health Insurance Member ID (keyword anchored, e.g. HIX-784392651, HIN-123456)
  {
    name: 'Health Insurance Member ID (keyword anchored)',
    type: 'INSURANCE',
    regex: /\b(?:health\s*insurance|insurance\s*(?:member|id)|member\s*id|group\s*id|subscriber\s*id|policy\s*(?:number|no\.?|#|id))\s*[:\-]?\s*[A-Z]{2,5}[-]?\d{5,12}\b/gi,
  },
  // Structural health insurance ID (HIX-nnnnnn pattern without keyword)
  {
    name: 'Health Insurance ID (HIX/HIN pattern)',
    type: 'INSURANCE',
    regex: /\b(?:HIX|HIN|HIC|MBI)[-]?\d{6,12}\b/g,
  },

  // US Home Address (structural: number + street name + street type + city, ST ZIP)
  {
    name: 'US Home Address',
    type: 'ADDRESS',
    regex: /\b\d{1,5}\s+[A-Za-z]+(?:\s+[A-Za-z]+){0,3}\s+(?:Street|St\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Road|Rd\.?|Way|Court|Ct\.?|Place|Pl\.?|Circle|Cir\.?|Trail|Trl\.?|Terrace|Ter\.?|Parkway|Pkwy\.?)[,.]?\s*[A-Za-z]+(?:\s+[A-Za-z]+){0,2}[,.]?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g,
  },
  // Keyword-anchored address (supports non-ASCII street names: ß, ä, ö, ü, é, à, etc.)
  {
    name: 'Address (keyword anchored)',
    type: 'ADDRESS',
    captureGroup: 1,
    regex: /\b(?:home\s*address|mailing\s*address|street\s*address|residential\s*address|address)\s*[:\-]\s*(\d{1,5}[\s\S]{3,120}?(?:\d{4,6}[\s\S]{0,30}?(?:Germany|Deutschland|France|España|Spain|Italy|Italia|Netherlands|Belgium|Portugal|Brazil|Brasil|UK|USA|United States|United Kingdom)[^.!?\n]*|\d{5}(?:-\d{4})?))/gi,
  },
  // EU Address (keyword anchored, handles umlauts, accented chars, zip+city patterns)
  {
    name: 'EU/Intl Address (keyword anchored)',
    type: 'ADDRESS',
    regex: /\b(?:home\s*address|mailing\s*address|street\s*address|residential\s*address|wohn(?:ort|adresse)|adresse|dirección|indirizzo|endereço)\s*[:\-]\s*\d{1,5}[^\n.!?]{5,100}?\d{4,6}[^\n.!?]{0,50}/gi,
  },

  // Passport (general) - keyword anchored to reduce collisions with random alphanumerics
  // Supports: AB1234567, FAKEP-DE-93821, P-123456789 (hyphenated/prefixed formats)
  {
    name: 'Passport (General) (keyword anchored)',
    type: 'PASSPORT',
    captureGroup: 1,
    regex: /\b(?:passport|pass(?:port)?)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*([A-Z]{1,6}(?:[-]?[A-Z]{0,3}[-]?)?\d{4,9})\b/gi,
  },
  {
    name: 'US Passport Number (keyword anchored)',
    type: 'PASSPORT',
    regex: /\bpassport\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{9}\b/gi,
  },
  {
    name: "US Driver's License (keyword anchored)",
    type: 'DL',
    regex: /\b(?:driver'?s?\s*license|driving\s*license|dl)\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*(?:[A-Z]{2}\s+)?[A-Z]?\d{5,10}\b/gi,
  },

  // Keyword-anchored IDs
  {
    name: 'Case/Client/Patient/Invoice ID',
    type: 'CASEID',
    regex: /\b(?:case|matter|file|client|patient|mrn|invoice|claim|ticket)\s*(?:#|no\.|number|id)?\s*[:\-]?\s*[A-Z0-9][A-Z0-9\-_/]{3,}\b/gi,
  },
]

