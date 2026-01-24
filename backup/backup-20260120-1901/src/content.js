import nlp from 'compromise';
import { faker } from '@faker-js/faker';

console.log("SafePrompt Enterprise Logic Loaded 🛡️");

// --- 1. STATE MANAGEMENT ---
let piiMap = {}; 
let isPremium = localStorage.getItem('safePromptPremium') === 'true';
let isProtectionActive = true;
let currentTabId = null;
let vaultKey = null;
let lastSecuredPromptHash = null;

const VAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const DEBUG = localStorage.getItem('safePromptDebug') === 'true';

function logDebug(...args) {
    if (DEBUG) console.log('[SafePrompt]', ...args);
}

function stableHash(str) {
    // Simple non-crypto hash for session tracking (not for security).
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
}

// Sync state with Popup
chrome.storage.local.get(['protectionActive'], (res) => {
    isProtectionActive = res.protectionActive !== false;
});

async function getTabId() {
    return await new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage({ action: 'get_tab_id' }, (resp) => {
                if (chrome.runtime.lastError) return resolve(null);
                resolve(resp?.tabId ?? null);
            });
        } catch {
            resolve(null);
        }
    });
}

function storageSessionAvailable() {
    return !!(chrome?.storage?.session);
}

async function loadVault() {
    if (!storageSessionAvailable() || !vaultKey) return;
    return await new Promise((resolve) => {
        chrome.storage.session.get([vaultKey], (res) => {
            const entry = res?.[vaultKey];
            if (!entry || typeof entry !== 'object') return resolve();
            const { piiMap: storedMap, updatedAt, lastSecuredPromptHash: storedHash } = entry;
            if (!updatedAt || Date.now() - updatedAt > VAULT_TTL_MS) {
                chrome.storage.session.remove([vaultKey], () => resolve());
                return;
            }
            if (storedMap && typeof storedMap === 'object') piiMap = storedMap;
            if (storedHash) lastSecuredPromptHash = storedHash;
            logDebug('Vault loaded', { keys: Object.keys(piiMap).length });
            resolve();
        });
    });
}

async function saveVault() {
    if (!storageSessionAvailable() || !vaultKey) return;
    const payload = {
        piiMap,
        updatedAt: Date.now(),
        lastSecuredPromptHash
    };
    return await new Promise((resolve) => {
        chrome.storage.session.set({ [vaultKey]: payload }, () => resolve());
    });
}

async function clearVault() {
    if (!storageSessionAvailable() || !vaultKey) return;
    return await new Promise((resolve) => {
        chrome.storage.session.remove([vaultKey], () => resolve());
    });
}

// Init vault (per-tab)
(async () => {
    currentTabId = await getTabId();
    if (currentTabId != null) vaultKey = `vault:${currentTabId}`;
    await loadVault();
})();

// --- Helpers (format-preserving replacements) ---
function replaceDigitsInString(original, newDigits) {
    let i = 0;
    let out = '';
    for (const ch of original) {
        if (/\d/.test(ch) && i < newDigits.length) {
            out += newDigits[i++];
        } else {
            out += ch;
        }
    }
    return out;
}

function fakeUkPostcode() {
    // Plausible UK postcode structure; not guaranteed to be a real postcode.
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
    const letters = 'ABCEGHJKLMNPRSTWXYZ'.split(''); // excludes D, F, I, O, Q, U, V
    const suffix = faker.helpers.arrayElement(['A', 'B', 'C', 'D']);
    // Avoid prohibited prefixes by regenerating if needed.
    while (true) {
        const prefix = faker.helpers.arrayElement(letters) + faker.helpers.arrayElement(letters);
        if (['BG', 'GB', 'KN', 'NK', 'NT', 'TN', 'ZZ'].includes(prefix)) continue;
        const digits = faker.string.numeric(6);
        return `${prefix}${digits}${suffix}`;
    }
}

// --- 2. PII DETECTION RULES (The Engine) ---
// Order matters: Specific/Long patterns first, Generic/Short patterns last.
const PII_RULES = [
    // --- Secrets / Credentials (High impact for enterprises) ---
    {
        name: 'Private Key Block (PEM)',
        regex: /-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g,
        getFake: () => `[[REDACTED_PRIVATE_KEY_${faker.string.alphanumeric(8).toUpperCase()}]]`
    },
    {
        name: 'JWT Token',
        // header.payload.signature (base64url-ish)
        regex: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
        getFake: () => `jwt_${faker.string.alphanumeric(32)}`
    },
    {
        name: 'AWS Access Key ID',
        regex: /\bAKIA[0-9A-Z]{16}\b/g,
        getFake: () => `AKIA${faker.string.alphanumeric(16).toUpperCase()}`
    },
    {
        name: 'Google API Key',
        regex: /\bAIza[0-9A-Za-z\-_]{30,}\b/g,
        getFake: () => `AIza${faker.string.alphanumeric(32)}`
    },
    {
        name: 'GitHub Token',
        regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g,
        getFake: () => `ghp_${faker.string.alphanumeric(36)}`
    },
    {
        name: 'Slack Token',
        regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
        getFake: () => `xoxb-${faker.string.numeric(11)}-${faker.string.numeric(11)}-${faker.string.alphanumeric(24)}`
    },
    {
        name: 'Stripe Secret Key',
        regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
        getFake: () => `sk_test_${faker.string.alphanumeric(24)}`
    },
    {
        name: 'Email',
        regex: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi,
        getFake: () => faker.internet.email()
    },
    {
        name: 'IBAN (EU Bank)',
        regex: /\b[A-Z]{2}\d{2}[a-zA-Z0-9]{4,30}\b/g,
        getFake: () => faker.finance.iban()
    },
    // --- UK identifiers ---
    {
        name: 'UK Postcode',
        // Covers common formats like SW1A 1AA, M1 1AE, B33 8TH (case-insensitive)
        regex: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi,
        getFake: () => fakeUkPostcode()
    },
    {
        name: 'UK NINO (National Insurance Number)',
        // e.g. QQ 12 34 56 C (with optional spaces)
        regex: /\b(?!BG)(?!GB)(?!KN)(?!NK)(?!NT)(?!TN)(?!ZZ)[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi,
        getFake: () => fakeUkNino()
    },
    {
        name: 'UK NHS Number (keyword anchored)',
        regex: /\bNHS\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{3}\s?\d{3}\s?\d{4}\b/gi,
        getFake: (match) => replaceDigitsInString(match, faker.string.numeric(10))
    },
    {
        name: 'UK UTR (keyword anchored)',
        regex: /\bUTR\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{3}\s?\d{3}\s?\d{4}\b/gi,
        getFake: (match) => replaceDigitsInString(match, faker.string.numeric(10))
    },
    {
        name: 'UK Sort Code (keyword anchored)',
        regex: /\bsort\s*code\s*[:\-]?\s*\d{2}[- ]?\d{2}[- ]?\d{2}\b/gi,
        getFake: (match) => replaceDigitsInString(match, faker.string.numeric(6))
    },
    {
        name: 'UK Account Number (keyword anchored)',
        regex: /\baccount\s*(?:number|no\.?|#|id)?\s*[:\-]?\s*\d{8}\b/gi,
        getFake: (match) => replaceDigitsInString(match, faker.string.numeric(8))
    },
    // --- Germany (DE) identifiers ---
    {
        name: 'DE VAT ID (USt-IdNr)',
        regex: /\bDE\s?\d{9}\b/gi,
        getFake: () => `DE${faker.string.numeric(9)}`
    },
    {
        name: 'DE Steuer-ID (keyword anchored)',
        // Matches 11 digits, optionally spaced, when prefixed by common labels.
        regex: /\b(?:Steuer(?:-?ID|identifikationsnummer)|IdNr\.?)\s*[:\-]?\s*\d(?:\s?\d){10}\b/gi,
        getFake: (match) => replaceDigitsInString(match, faker.string.numeric(11))
    },
    {
        name: 'DE Personalausweis/Reisepass (keyword anchored)',
        regex: /\b(?:Personalausweis|Ausweisnummer|Reisepass(?:nummer)?|Passnummer|Pass-?Nr\.?)\s*[:\-]?\s*[A-Z0-9]{8,12}\b/gi,
        getFake: (match) => match.replace(/[A-Z0-9]{8,12}\b/, faker.string.alphanumeric({ length: 9, casing: 'upper' }))
    },
    {
        name: 'DE Health Insurance (KVNR) (keyword anchored)',
        regex: /\b(?:KVNR|Krankenversichertennummer|Versichertennummer)\s*[:\-]?\s*[A-Z]\d{9}\b/gi,
        getFake: (match) => match.replace(/[A-Z]\d{9}\b/, `${faker.string.alpha({ length: 1, casing: 'upper' })}${faker.string.numeric(9)}`)
    },
    {
        name: 'DE Address (street + house + PLZ)',
        // Conservative: only fires when we see typical DE street words and a 5-digit PLZ.
        regex: /\b[A-ZÄÖÜ][\wÄÖÜäöüß.-]+(?:\s+[A-ZÄÖÜ][\wÄÖÜäöüß.-]+){0,4}\s+(?:Straße|Str\.|Weg|Platz|Allee|Gasse|Ring|Damm)\s+\d{1,4}[a-zA-Z]?(?:,\s*)?\d{5}\s+[A-ZÄÖÜ][\wÄÖÜäöüß.-]+\b/g,
        getFake: () => `${faker.location.streetAddress()}, ${faker.string.numeric(5)} ${faker.location.city()}`
    },
    {
        name: 'Credit Card',
        regex: /\b(?:\d[ -]*?){13,19}\b/g,
        getFake: () => faker.finance.creditCardNumber()
    },
    {
        name: 'US SSN',
        regex: /\b\d{3}-\d{2}-\d{4}\b/g,
        getFake: () => faker.helpers.replaceSymbolWithNumber('###-##-####') // Fake SSN format
    },
    {
        name: 'US EIN (Tax ID)',
        regex: /\b\d{2}-\d{7}\b/g,
        getFake: () => faker.helpers.replaceSymbolWithNumber('##-#######')
    },
    // --- Dates of birth / sensitive dates (US/EU common formats) ---
    {
        name: 'DOB (YYYY-MM-DD)',
        regex: /\b\d{4}-\d{2}-\d{2}\b/g,
        getFake: () => {
            const d = faker.date.birthdate({ min: 18, max: 90, mode: 'age' });
            const yyyy = String(d.getFullYear()).padStart(4, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
    },
    {
        name: 'DOB (MM/DD/YYYY)',
        regex: /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}\b/g,
        getFake: () => {
            const d = faker.date.birthdate({ min: 18, max: 90, mode: 'age' });
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const yyyy = String(d.getFullYear()).padStart(4, '0');
            return `${mm}/${dd}/${yyyy}`;
        }
    },
    {
        name: 'DOB (DD/MM/YYYY)',
        regex: /\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/\d{4}\b/g,
        getFake: () => {
            const d = faker.date.birthdate({ min: 18, max: 90, mode: 'age' });
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = String(d.getFullYear()).padStart(4, '0');
            return `${dd}/${mm}/${yyyy}`;
        }
    },
    {
        name: 'IPv4 Address',
        regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
        getFake: () => faker.internet.ipv4()
    },
    {
        name: 'Israeli ID (TZ)',
        regex: /\b\d{9}\b/g,
        getFake: () => faker.string.numeric(9)
    },
    {
        name: 'Israeli Phone',
        regex: /(05[0-9]-?[0-9]{7})/g,
        getFake: () => faker.phone.number('05#-#######')
    },
    {
        name: 'US/Intl Phone',
        regex: /\b\+?1?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        getFake: () => faker.phone.number('###-###-####')
    },
    {
        name: 'Passport (General)',
        regex: /\b[A-Z]{1,2}\d{6,9}\b/g,
        getFake: () => faker.string.alphanumeric(9).toUpperCase()
    },
    // --- Keyword-anchored business/medical/legal identifiers (low false positives) ---
    {
        name: 'Case/Client/Patient/Invoice ID',
        regex: /\b(?:case|matter|file|client|patient|mrn|invoice|claim|ticket)\s*(?:#|no\.|number|id)?\s*[:\-]?\s*[A-Z0-9][A-Z0-9\-_/]{3,}\b/gi,
        getFake: () => `ID-${faker.string.alphanumeric(10).toUpperCase()}`
    }
];

// --- 3. CORE LOGIC ---

function sanitize(text) {
    if (!isProtectionActive) return text;

    // Guard: always operate on a string
    if (typeof text !== 'string') text = text == null ? '' : String(text);

    let cleanText = text;
    let itemsFound = 0;

    const getOrCreateFakeName = (realName) => {
        if (!realName || realName.length < 3) return null;
        let fakeName = Object.keys(piiMap).find(key => piiMap[key] === realName);
        if (!fakeName) {
            fakeName = faker.person.fullName();
            piiMap[fakeName] = realName;
        }
        return fakeName;
    };

    const replaceNameEverywhere = (realName) => {
        if (!realName || realName.length < 3) return;

        const fakeName = getOrCreateFakeName(realName);
        if (!fakeName) return;
        if (cleanText.includes(realName)) {
            cleanText = cleanText.split(realName).join(fakeName);
            itemsFound++;
        }
    };

    // STEP 0: Structured fields (very high confidence)
    // Example: "full_name": "Yair Lapid" (common in JSON payloads / logs)
    // We replace only the quoted value to avoid any unintended transformations.
    const structuredFullNameRegex = /("full[_-]?name"\s*:\s*")([^"\n\r]{3,100})(")/gi;
    cleanText = cleanText.replace(structuredFullNameRegex, (match, prefix, realName, suffix) => {
        const fakeName = getOrCreateFakeName(realName.trim());
        if (!fakeName) return match;
        itemsFound++;
        return `${prefix}${fakeName}${suffix}`;
    });

    // STEP A: NLP for Names (Context Aware)
    // We run this first because it relies on sentence structure
    const doc = nlp(text);
    const people = doc.people().out('array');
    
    people.forEach(realName => {
        // Filter out false positives (single short words often misidentified)
        replaceNameEverywhere(realName);
    });

    // STEP A2: Heuristics for common UK/DE names (titles + salutations)
    // Helps catch names compromise may miss, while keeping false positives low.
    const COMMON_UK_FIRST_NAMES = new Set([
        'James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles',
        'George','Edward','Henry','Jack','Oliver','Harry','Jacob','Noah','Leo','Oscar',
        'Emily','Olivia','Amelia','Isla','Ava','Ella','Sophie','Mia','Grace','Lily'
    ]);
    const COMMON_DE_FIRST_NAMES = new Set([
        'Hans','Peter','Klaus','Jürgen','Heinz','Günter','Wolfgang','Thomas','Michael','Stefan',
        'Andreas','Christian','Markus','Matthias','Johannes','Alexander','Daniel','Lukas','Leon','Felix',
        'Anna','Laura','Julia','Lisa','Lea','Sarah','Lena','Marie','Sophia','Hannah'
    ]);

    const maybeCommonUkDeFirstName = (first) => COMMON_UK_FIRST_NAMES.has(first) || COMMON_DE_FIRST_NAMES.has(first);

    const titleNameRegex = /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof|Sir|Lady|Herr|Frau)\.?\s+([A-ZÄÖÜ][a-zA-ZÄÖÜäöüß]+)(?:\s+([A-ZÄÖÜ][a-zA-ZÄÖÜäöüß]+))?\b/g;
    for (const m of cleanText.matchAll(titleNameRegex)) {
        const first = m[1];
        const last = m[2];
        if (!first) continue;
        if (!maybeCommonUkDeFirstName(first)) continue;
        const full = last ? `${first} ${last}` : first;
        replaceNameEverywhere(full);
    }

    const dearRegex = /\bDear\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g;
    for (const m of cleanText.matchAll(dearRegex)) {
        const first = m[1];
        const last = m[2];
        if (!first || !last) continue;
        if (!maybeCommonUkDeFirstName(first)) continue;
        replaceNameEverywhere(`${first} ${last}`);
    }

    // STEP B: Regex Rules Engine
    PII_RULES.forEach(rule => {
        cleanText = cleanText.replace(rule.regex, (match) => {
            // Check if we already have a fake value for this exact match
            let fakeValue = Object.keys(piiMap).find(key => piiMap[key] === match);
            
            if (!fakeValue) {
                fakeValue = rule.getFake.length ? rule.getFake(match) : rule.getFake();
                piiMap[fakeValue] = match;
            }
            itemsFound++;
            return fakeValue;
        });
    });

    // STEP C: Update Badge Counter
    if (itemsFound > 0) {
        chrome.storage.local.get(['protectedCount'], (res) => {
            const current = res.protectedCount || 0;
            chrome.storage.local.set({ protectedCount: current + itemsFound });
        });
    }

    // Persist vault when we changed anything
    if (itemsFound > 0) saveVault();

    return cleanText;
}

function restore(text) {
    let restoredText = text;
    
    // Sort keys by length (Longest first) to avoid partial replacement collisions
    const sortedKeys = Object.keys(piiMap).sort((a, b) => b.length - a.length);
    
    sortedKeys.forEach(fake => {
        const real = piiMap[fake];
        // Global replace of the fake value back to real
        restoredText = restoredText.split(fake).join(real);
    });

    // --- WATERMARK (Free Tier) ---
    if (!isPremium && sortedKeys.length > 0) {
        const watermark = "\n\n🔒 Protected by SafePrompt (Free Version)";
        // Only add if not already present
        if (!restoredText.includes("Protected by SafePrompt")) {
            restoredText += watermark;
        }
    }

    return restoredText;
}

// --- 4. UI INJECTION ---

function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
}

function findPromptElement() {
    const host = location.host;

    // Prefer host-specific selectors first, then generic fallbacks.
    const selectorsByHost = {
        // ChatGPT
        "chatgpt.com": ['#prompt-textarea', 'textarea', 'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]'],

        // Claude
        "claude.ai": ['div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]', 'textarea'],

        // Gemini
        "gemini.google.com": ['div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]', 'textarea'],

        // Grok
        "grok.com": ['textarea', 'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]'],
        "x.ai": ['textarea', 'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]']
    };

    const selectors = selectorsByHost[host] ?? ['textarea', 'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]'];

    const active = document.activeElement;
    if (active instanceof Element && isVisible(active)) {
        const isTextarea = active instanceof HTMLTextAreaElement;
        const isEditable = !isTextarea && (active.getAttribute('contenteditable') === 'true' || active.isContentEditable);
        if (isTextarea || isEditable) {
            logDebug('Prompt picked via activeElement');
            return active;
        }
    }

    const scored = [];
    for (const sel of selectors) {
        const candidates = Array.from(document.querySelectorAll(sel)).filter(isVisible);
        for (const el of candidates) {
            const r = el.getBoundingClientRect();
            let score = 0;
            // near bottom is good
            score += Math.max(0, Math.min(1000, r.bottom));
            // width heuristic to avoid sidebars/small inputs
            if (r.width >= 300) score += 500;
            // prefer central/right areas (avoid left nav)
            if (r.left > 120) score += 200;
            // prefer larger height slightly
            if (r.height >= 24) score += 50;
            scored.push({ el, score, sel, r });
        }
    }

    if (!scored.length) return null;
    scored.sort((a, b) => b.score - a.score);

    if (DEBUG) {
        logDebug('Prompt candidates', scored.slice(0, 5).map(c => ({
            sel: c.sel, score: c.score, left: Math.round(c.r.left), bottom: Math.round(c.r.bottom), w: Math.round(c.r.width), h: Math.round(c.r.height)
        })));
    }

    return scored[0].el;
}

function getPromptText(el) {
    if (!el) return '';
    if (el instanceof HTMLTextAreaElement) return el.value ?? '';
    return (el.innerText ?? el.textContent ?? '').trim();
}

function setPromptText(el, text) {
    if (!el) return;
    if (el instanceof HTMLTextAreaElement) {
        // React Value Setter Hack
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setter.call(el, text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return;
    }

    // contenteditable
    el.textContent = text;
    try {
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    } catch {
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function findResponseNodes() {
    const host = location.host;
    const selectorsByHost = {
        "chatgpt.com": ['.markdown', '[data-message-author-role]', 'article'],
        "claude.ai": ['article', '.prose', '[data-testid*="message"]'],
        "gemini.google.com": ['.markdown', '.prose', '[role="article"]', '[data-message-id]'],
        "grok.com": ['.markdown', '.prose', '[role="article"]', '[data-message-id]'],
        "x.ai": ['.markdown', '.prose', '[role="article"]', '[data-message-id]']
    };

    const selectors = selectorsByHost[host] ?? ['.markdown', '.prose', '[role="article"]', 'article'];
    const nodes = [];
    for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(n => nodes.push(n));
    }
    return nodes;
}

function detectPII(text) {
    const s = String(text ?? '');
    if (!s.trim()) return { detected: false, reasons: [] };

    const reasons = [];

    try {
        const doc = nlp(s);
        const people = doc.people().out('array');
        if (people?.some(n => typeof n === 'string' && n.length >= 3)) reasons.push('Name');
    } catch {
        // ignore
    }

    // Structured full_name
    if (/"full[_-]?name"\s*:\s*"[^"\n\r]{3,100}"/i.test(s)) reasons.push('full_name');

    for (const rule of PII_RULES) {
        try {
            if (rule.regex.test(s)) reasons.push(rule.name);
        } catch {
            // ignore
        }
    }

    return { detected: reasons.length > 0, reasons: Array.from(new Set(reasons)) };
}

function ensureWarningUI() {
    if (document.getElementById('safe-prompt-warning')) return;

    const overlay = document.createElement('div');
    overlay.id = 'safe-prompt-warning';
    Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
        fontFamily: 'Segoe UI, sans-serif'
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
        width: 'min(420px, calc(100vw - 32px))',
        background: '#fff',
        color: '#111',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
    });

    const title = document.createElement('div');
    title.id = 'safe-prompt-warning-title';
    title.innerText = 'PII detected';
    Object.assign(title.style, { fontSize: '16px', fontWeight: '700', marginBottom: '6px' });

    const body = document.createElement('div');
    body.id = 'safe-prompt-warning-body';
    body.innerText = 'Sensitive data may be included in this message.';
    Object.assign(body.style, { fontSize: '13px', lineHeight: '1.4', color: '#333', marginBottom: '12px' });

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', gap: '8px', justifyContent: 'flex-end' });

    const secureBtn = document.createElement('button');
    secureBtn.id = 'safe-prompt-warning-secure';
    secureBtn.innerText = 'Use Secure Send';
    Object.assign(secureBtn.style, {
        padding: '8px 12px',
        backgroundColor: '#10a37f',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '700'
    });

    const contBtn = document.createElement('button');
    contBtn.id = 'safe-prompt-warning-continue';
    contBtn.innerText = 'Continue anyway';
    Object.assign(contBtn.style, {
        padding: '8px 12px',
        backgroundColor: '#fff',
        color: '#111',
        border: '1px solid #ddd',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600'
    });

    btnRow.appendChild(contBtn);
    btnRow.appendChild(secureBtn);

    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
}

function showWarning(reasons, onSecure, onContinue) {
    ensureWarningUI();
    const overlay = document.getElementById('safe-prompt-warning');
    const title = document.getElementById('safe-prompt-warning-title');
    const body = document.getElementById('safe-prompt-warning-body');
    const secureBtn = document.getElementById('safe-prompt-warning-secure');
    const contBtn = document.getElementById('safe-prompt-warning-continue');

    if (!overlay || !title || !body || !secureBtn || !contBtn) return false;

    title.innerText = 'PII detected';
    body.innerText = `Sensitive data may be included (${reasons.join(', ')}). Use Secure Send to sanitize, or continue unprotected.`;

    const cleanup = () => {
        overlay.style.display = 'none';
        secureBtn.onclick = null;
        contBtn.onclick = null;
    };

    contBtn.onclick = () => { cleanup(); onContinue?.(); };
    secureBtn.onclick = () => { cleanup(); onSecure?.(); };

    overlay.style.display = 'flex';
    // Focus default on Secure Send
    setTimeout(() => secureBtn.focus(), 0);
    return true;
}

function findSendButton() {
    const host = location.host;
    const selectorsByHost = {
        "chatgpt.com": ['button[data-testid="send-button"]', 'button[aria-label*="Send" i]'],
        "claude.ai": ['button[aria-label*="Send" i]', 'button[type="submit"]'],
        "gemini.google.com": ['button[aria-label*="Send" i]', 'button[type="submit"]'],
        "grok.com": ['button[aria-label*="Send" i]', 'button[type="submit"]'],
        "x.ai": ['button[aria-label*="Send" i]', 'button[type="submit"]']
    };
    const selectors = selectorsByHost[host] ?? ['button[aria-label*="Send" i]', 'button[type="submit"]'];
    for (const sel of selectors) {
        const btn = Array.from(document.querySelectorAll(sel)).find(isVisible);
        if (btn) return btn;
    }
    return null;
}

function injectControls() {
    if (document.getElementById('safe-prompt-container')) return;

    const container = document.createElement('div');
    container.id = 'safe-prompt-container';
    Object.assign(container.style, {
        position: 'fixed', bottom: '20px', right: '20px', zIndex: '2147483647',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px',
        fontFamily: 'Segoe UI, sans-serif'
    });

    // Upgrade Button
    const upgradeBtn = document.createElement('button');
    const updateUpgradeBtn = () => {
        upgradeBtn.innerText = isPremium ? '💎 Premium Active' : '⚡ Upgrade (Remove Watermark)';
        Object.assign(upgradeBtn.style, {
            fontSize: '11px', padding: '6px 12px', 
            backgroundColor: isPremium ? '#FFD700' : '#222', 
            color: isPremium ? '#000' : '#fff',
            border: 'none', borderRadius: '20px', cursor: 'pointer', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'all 0.2s'
        });
    };
    updateUpgradeBtn();
    
    upgradeBtn.onclick = () => {
        isPremium = !isPremium;
        localStorage.setItem('safePromptPremium', isPremium);
        updateUpgradeBtn();
        alert(isPremium ? "Enterprise Plan Activated! 🚀" : "Switched to Free Plan.");
    };

    // Main Action Button
    const actionBtn = document.createElement('button');
    actionBtn.innerText = '🛡️ Secure Send';
    Object.assign(actionBtn.style, {
        padding: '10px 20px', backgroundColor: '#10a37f', color: 'white',
        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
        fontSize: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)', transition: 'background 0.2s'
    });
    
    actionBtn.onmouseover = () => actionBtn.style.backgroundColor = '#0e8e6d';
    actionBtn.onmouseout = () => actionBtn.style.backgroundColor = '#10a37f';

    // Reveal button (only shown after a Secure Send that actually created replacements)
    const revealBtn = document.createElement('button');
    revealBtn.id = 'safe-prompt-reveal-btn';
    revealBtn.innerText = 'Reveal Original Data';
    Object.assign(revealBtn.style, {
        padding: '8px 16px',
        backgroundColor: '#2563eb', // distinct from Secure Send
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.18)',
        transition: 'background 0.2s',
        display: 'none'
    });
    revealBtn.onmouseover = () => revealBtn.style.backgroundColor = '#1d4ed8';
    revealBtn.onmouseout = () => revealBtn.style.backgroundColor = '#2563eb';

    const showRevealBtn = () => { revealBtn.style.display = 'block'; };
    const hideRevealBtn = () => { revealBtn.style.display = 'none'; };

    const doSecureSend = () => {
        const promptEl = findPromptElement();
        if (!promptEl) return alert('Could not find prompt input. Click the input box and try again.');

        const original = getPromptText(promptEl);
        if (!original) return alert('Please type a prompt first!');

        const safe = sanitize(original);
        setPromptText(promptEl, safe);
        lastSecuredPromptHash = stableHash(getPromptText(promptEl));
        saveVault();

        // Show reveal button only if we actually changed the text and have mappings
        if (Object.keys(piiMap).length > 0 && safe !== original) showRevealBtn();
        else hideRevealBtn();

        const originalText = actionBtn.innerText;
        actionBtn.innerText = `Secured! ✨`;
        setTimeout(() => actionBtn.innerText = originalText, 2000);
    };

    actionBtn.onclick = async () => {
        doSecureSend();
    };

    // Restore Handler
    actionBtn.oncontextmenu = (e) => {
        e.preventDefault();
        findResponseNodes().forEach(node => {
            const txt = node.innerText ?? node.textContent;
            if (!txt) return;
            node.innerText = restore(txt);
        });
    };

    // Reveal Handler (same as restore, but explicit + hides itself after use)
    revealBtn.onclick = () => {
        findResponseNodes().forEach(node => {
            const txt = node.innerText ?? node.textContent;
            if (!txt) return;
            node.innerText = restore(txt);
        });
        // Hide after use until next Secure Send
        hideRevealBtn();
    };

    container.appendChild(upgradeBtn);
    container.appendChild(actionBtn);
    container.appendChild(revealBtn);
    document.body.appendChild(container);
    console.log("SafePrompt injected controls ✅");

    // Warn-only intercept: user tries to send without securing
    const maybeWarnBeforeSend = (triggerSendFn) => {
        if (!isProtectionActive) return false;
        const promptEl = findPromptElement();
        if (!promptEl) return false;
        const txt = getPromptText(promptEl);
        if (!txt) return false;

        const currentHash = stableHash(txt);
        if (lastSecuredPromptHash && currentHash === lastSecuredPromptHash) return false;

        const { detected, reasons } = detectPII(txt);
        if (!detected) return false;

        return showWarning(reasons,
            () => doSecureSend(),
            () => {
                // Allow native send to proceed
                triggerSendFn?.();
            }
        );
    };

    // Capture Enter/Ctrl+Enter on the prompt (best-effort)
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const active = document.activeElement;
        const promptEl = findPromptElement();
        if (!promptEl) return;
        if (active !== promptEl && !promptEl.contains(active)) return;
        if (e.shiftKey) return; // allow newline

        const sendBtn = findSendButton();
        const trigger = () => {
            // best effort: click send button
            if (sendBtn) {
                // avoid recursion by temporarily disabling protection check
                const prev = lastSecuredPromptHash;
                lastSecuredPromptHash = null;
                sendBtn.click();
                lastSecuredPromptHash = prev;
            }
        };

        const warned = maybeWarnBeforeSend(trigger);
        if (warned) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // Capture click on send button (site-specific + fallback)
    document.addEventListener('click', (e) => {
        const sendBtn = findSendButton();
        if (!sendBtn) return;
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (target !== sendBtn && !sendBtn.contains(target)) return;

        const trigger = () => {
            const prev = lastSecuredPromptHash;
            lastSecuredPromptHash = null;
            sendBtn.click();
            lastSecuredPromptHash = prev;
        };

        const warned = maybeWarnBeforeSend(trigger);
        if (warned) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
}

// --- 5. LISTENERS ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
        sendResponse({
            ok: true,
            isPremium,
            isProtectionActive,
            hasControls: !!document.getElementById('safe-prompt-container'),
            vaultKeys: Object.keys(piiMap).length
        });
        return;
    }
    if (request.action === "clear_mapping") {
        piiMap = {};
        lastSecuredPromptHash = null;
        clearVault();
        const reveal = document.getElementById('safe-prompt-reveal-btn');
        if (reveal) reveal.style.display = 'none';
        alert("Session History Cleared.");
    }
    if (request.action === "toggle_protection") {
        isProtectionActive = request.state;
    }
});

setInterval(injectControls, 1000);

// After applying this code, remind me to run npm run build and refresh the extension.
