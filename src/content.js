import { sanitize as engineSanitize, detectPII as engineDetectPII } from './engine/sanitize.js';
import { restoreText as engineRestoreText, restoreInDomSubtree as engineRestoreInDomSubtree, ensureWatermarkOnce as engineEnsureWatermarkOnce } from './engine/restore.js';
import { findPromptElement as siteFindPromptElement, getPromptText as siteGetPromptText, setPromptText as siteSetPromptText, findSendButton as siteFindSendButton, findResponseNodes as siteFindResponseNodes, isVisible as siteIsVisible } from './sites/selectors.js';

console.log("SafePrompt Enterprise Logic Loaded 🛡️");

// #region agent log
const __SP_DEBUG_ENDPOINT__ =
  'http://127.0.0.1:7242/ingest/50cb2714-8d8e-485c-805d-14fbde20aa84'
const __SP_DEBUG_SESSION__ = 'debug-session'
const __SP_DEBUG_RUN__ = 'bughunt-pre'
function spLog(hypothesisId, location, message, data) {
    try {
        fetch(__SP_DEBUG_ENDPOINT__, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: __SP_DEBUG_SESSION__,
                runId: __SP_DEBUG_RUN__,
                hypothesisId,
                location,
                message,
                data,
                timestamp: Date.now()
            })
        }).catch(()=>{});
    } catch {}
}
// #endregion agent log

// --- 1. STATE MANAGEMENT ---
const tokenToReal = Object.create(null);
const realToToken = Object.create(null);
const tokenCounters = Object.create(null);
let isPremium = localStorage.getItem('safePromptPremium') === 'true';
let isProtectionActive = true;
let currentTabId = null;
let vaultKey = null;
let lastSecuredPromptHash = null;
let allowUnprotectedSendOnce = false;

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

// #region agent log
spLog('H_INIT', 'src/content.js:init', 'content_script_loaded', {
    host: location.host,
    href: location.href,
    isPremium,
    DEBUG
});
// #endregion agent log

// Sync state with Popup
chrome.storage.local.get(['protectionActive'], (res) => {
    isProtectionActive = res.protectionActive !== false;
    // #region agent log
    spLog('H_STATE', 'src/content.js:storage.local.get', 'protectionActive_loaded', { isProtectionActive });
    // #endregion agent log
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
                // #region agent log
                spLog('H_VAULT', 'src/content.js:loadVault', 'vault_expired_removed', { vaultKey, ageMs: updatedAt ? (Date.now() - updatedAt) : null });
                // #endregion agent log
                return;
            }
            // Backward compat: if an old piiMap is present, keep it but prefer token maps when available.
            if (entry.tokenToReal && typeof entry.tokenToReal === 'object') Object.assign(tokenToReal, entry.tokenToReal);
            if (entry.realToToken && typeof entry.realToToken === 'object') Object.assign(realToToken, entry.realToToken);
            if (entry.tokenCounters && typeof entry.tokenCounters === 'object') Object.assign(tokenCounters, entry.tokenCounters);
            if (storedHash) lastSecuredPromptHash = storedHash;
            logDebug('Vault loaded', { tokens: Object.keys(tokenToReal).length });
            // #region agent log
            spLog('H_VAULT', 'src/content.js:loadVault', 'vault_loaded', {
                vaultKey,
                tokenCount: Object.keys(tokenToReal).length,
                counterTypes: Object.keys(tokenCounters).length,
                hasStoredHash: !!storedHash
            });
            // #endregion agent log
            resolve();
        });
    });
}

async function saveVault() {
    if (!storageSessionAvailable() || !vaultKey) return;
    const payload = {
        tokenToReal,
        realToToken,
        tokenCounters,
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
    // #region agent log
    spLog('H_VAULT', 'src/content.js:initVault', 'vault_init_done', { currentTabId, vaultKey, tokenCount: Object.keys(tokenToReal).length });
    // #endregion agent log
})();

/*
 * Legacy inline fake-data rules removed from runtime bundle.
 * We now use the modular engine in `src/engine/*` (tokens + rules + sanitize + restore).
 */
/* --- 2. PII DETECTION RULES (legacy; unused) ---
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
*/

// --- 3. CORE LOGIC ---

function sanitize(text) {
    const { cleanText, itemsFound } = engineSanitize(
        text,
        { tokenToReal, realToToken, tokenCounters },
        { protectionActive: isProtectionActive }
    );

    if (itemsFound > 0) {
        chrome.storage.local.get(['protectedCount'], (res) => {
            const current = res.protectedCount || 0;
            chrome.storage.local.set({ protectedCount: current + itemsFound });
        });
        saveVault();
    }

    // #region agent log
    spLog('H_SECURE_SEND', 'src/content.js:sanitize', 'sanitize_done', {
        protectionActive: isProtectionActive,
        itemsFound,
        promptLen: String(text ?? '').length,
        cleanLen: String(cleanText ?? '').length,
        tokenCount: Object.keys(tokenToReal).length,
        counterTypes: Object.keys(tokenCounters).length
    });
    // #endregion agent log

    return cleanText;
}

function restore(text) {
    return engineRestoreText(text, tokenToReal);
}

// --- 4. UI INJECTION ---
function restoreResponsesAndMaybeWatermark({ addWatermark }) {
    if (!Object.keys(tokenToReal).length) return;
    const nodes = siteFindResponseNodes().filter(siteIsVisible);
    let any = 0;
    for (const n of nodes) {
        any += engineRestoreInDomSubtree(n, tokenToReal);
    }
    if (addWatermark && any > 0 && nodes.length) {
        engineEnsureWatermarkOnce(nodes[nodes.length - 1], { isPremium });
    }
}

function detectPII(text) {
    const res = engineDetectPII(text, { mode: 'warn' });
    // #region agent log
    spLog('H_WARN', 'src/content.js:detectPII', 'detectPII_warn_done', {
        detected: !!res?.detected,
        reasonCount: Array.isArray(res?.reasons) ? res.reasons.length : null,
        types: Array.isArray(res?.types) ? res.types : null,
        textLen: String(text ?? '').length
    });
    // #endregion agent log
    return res;
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

    contBtn.onclick = () => { cleanup(); allowUnprotectedSendOnce = true; onContinue?.(); };
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
    const actionBtnDefaultText = actionBtn.innerText;
    let actionBtnResetTimer = null;
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
        const promptEl = siteFindPromptElement({ debug: DEBUG, logDebug });
        if (!promptEl) return alert('Could not find prompt input. Click the input box and try again.');

        const original = siteGetPromptText(promptEl);
        if (!original) return alert('Please type a prompt first!');

        const safe = sanitize(original);
        siteSetPromptText(promptEl, safe);
        lastSecuredPromptHash = stableHash(siteGetPromptText(promptEl));
        saveVault();

        // Show reveal button only if we actually changed the text and have mappings
        if (Object.keys(tokenToReal).length > 0 && safe !== original) showRevealBtn();
        else hideRevealBtn();

        if (actionBtnResetTimer) clearTimeout(actionBtnResetTimer);
        actionBtn.innerText = `Secured! ✨`;
        actionBtnResetTimer = setTimeout(() => {
            actionBtn.innerText = actionBtnDefaultText;
            actionBtnResetTimer = null;
        }, 2000);
    };

    actionBtn.onclick = async () => {
        doSecureSend();
    };

    // Restore Handler
    actionBtn.oncontextmenu = (e) => {
        e.preventDefault();
        restoreResponsesAndMaybeWatermark({ addWatermark: true });
    };

    // Reveal Handler (same as restore, but explicit + hides itself after use)
    revealBtn.onclick = () => {
        restoreResponsesAndMaybeWatermark({ addWatermark: true });
        // Hide after use until next Secure Send
        hideRevealBtn();
    };

    container.appendChild(upgradeBtn);
    container.appendChild(actionBtn);
    container.appendChild(revealBtn);
    document.body.appendChild(container);
    console.log("SafePrompt injected controls ✅");

    // Reset Secure Send label when user starts typing a new prompt
    let lastPromptEl = null;
    const onPromptInput = () => {
        if (actionBtnResetTimer) {
            clearTimeout(actionBtnResetTimer);
            actionBtnResetTimer = null;
        }
        actionBtn.innerText = actionBtnDefaultText;
    };

    const attachPromptListener = () => {
        const p = siteFindPromptElement({ debug: DEBUG, logDebug });
        if (!p || p === lastPromptEl) return;
        if (lastPromptEl) lastPromptEl.removeEventListener('input', onPromptInput, true);
        lastPromptEl = p;
        lastPromptEl.addEventListener('input', onPromptInput, true);
    };

    // Attach now and keep it fresh as the page changes
    attachPromptListener();
    setInterval(attachPromptListener, 1500);

    // Warn-only intercept: user tries to send without securing
    const maybeWarnBeforeSend = (triggerSendFn) => {
        if (!isProtectionActive) return false;
        if (allowUnprotectedSendOnce) {
            allowUnprotectedSendOnce = false;
            return false;
        }
        const promptEl = siteFindPromptElement({ debug: DEBUG, logDebug });
        if (!promptEl) return false;
        const txt = siteGetPromptText(promptEl);
        if (!txt) return false;

        const currentHash = stableHash(txt);
        if (lastSecuredPromptHash && currentHash === lastSecuredPromptHash) return false;

        const { detected, reasons } = detectPII(txt, { mode: 'warn' });
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
        const promptEl = siteFindPromptElement({ debug: DEBUG, logDebug });
        if (!promptEl) return;
        if (active !== promptEl && !promptEl.contains(active)) return;
        if (e.shiftKey) return; // allow newline

        const sendBtn = siteFindSendButton();
        const trigger = () => {
            // best effort: click send button
            if (sendBtn) {
                sendBtn.click();
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
        const sendBtn = siteFindSendButton();
        if (!sendBtn) return;
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (target !== sendBtn && !sendBtn.contains(target)) return;

        const trigger = () => {
            sendBtn.click();
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
            vaultKeys: Object.keys(tokenToReal).length
        });
        return;
    }
    if (request.action === "clear_mapping") {
        for (const k of Object.keys(tokenToReal)) delete tokenToReal[k];
        for (const k of Object.keys(realToToken)) delete realToToken[k];
        for (const k of Object.keys(tokenCounters)) delete tokenCounters[k];
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
