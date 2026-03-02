import { buildGoogleFormPrefillUrl } from './reportFormPrefill.js'

const REPORT_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfTtz2qdXQVAlXJmLpzmvZZVRSDueaAOkd_nW3SAJGVhTFy2A/viewform'

const REPORT_FORM_ENTRY_IDS = {
  category: '1041758971',
  summary: '1402218764',
  steps: '543110351',
  diagnostics: '1673632342',
}

function el(id) {
  return document.getElementById(id)
}

function setStatus(msg) {
  const s = el('statusText')
  if (s) s.textContent = msg || ''
}

function safeHostname(url) {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs?.[0] ?? null
}

async function getLocal(keys) {
  return await new Promise((resolve) => chrome.storage.local.get(keys, (res) => resolve(res || {})))
}

async function getSession(keys) {
  // Best effort: chrome.storage.session may not exist in some contexts
  if (!chrome?.storage?.session) return {}
  return await new Promise((resolve) => chrome.storage.session.get(keys, (res) => resolve(res || {})))
}

async function buildDiagnostics() {
  const manifest = chrome.runtime.getManifest()
  const tab = await getActiveTab()
  const host = safeHostname(tab?.url)

  const local = await getLocal(['protectionActive', 'protectedCount'])
  const protectionActive = local.protectionActive !== false
  const protectedCount = Number(local.protectedCount || 0)

  const vaultKey = tab?.id != null ? `vault:${tab.id}` : null
  const sess = vaultKey ? await getSession([vaultKey]) : {}
  const vault = vaultKey ? sess?.[vaultKey] : null

  const tokenCount = vault?.tokenToReal && typeof vault.tokenToReal === 'object' ? Object.keys(vault.tokenToReal).length : 0
  const counterTypes = vault?.tokenCounters && typeof vault.tokenCounters === 'object' ? Object.keys(vault.tokenCounters).length : 0

  return {
    schema: 'safeprompt_diagnostics_v1',
    timestamp: new Date().toISOString(),
    extension: {
      id: chrome.runtime.id,
      name: manifest?.name,
      version: manifest?.version,
    },
    activeSite: {
      hostname: host,
    },
    settings: {
      protectionActive,
    },
    counters: {
      protectedCount,
      vault: {
        tokenCount,
        counterTypes,
        hasVault: !!vault,
      },
    },
    note: 'No prompt/response text included. No token->real mapping included.',
  }
}

function openForm() {
  const url = REPORT_FORM_URL
  if (!url || url.includes('REPLACE_ME')) {
    setStatus('Please set REPORT_FORM_URL in report.js (Google Form URL).')
    return
  }
  chrome.tabs.create({ url })
}

function formConfigured() {
  if (!REPORT_FORM_URL || REPORT_FORM_URL.includes('REPLACE_ME')) return false
  for (const v of Object.values(REPORT_FORM_ENTRY_IDS)) {
    if (!v || String(v).includes('REPLACE_ME')) return false
  }
  return true
}

async function submitReport() {
  if (!formConfigured()) {
    setStatus('Form is not configured yet. Set REPORT_FORM_URL + REPORT_FORM_ENTRY_IDS in report.js.')
    return
  }

  const catEl = el('category')
  const categoryValue = catEl?.value ?? ''
  const categoryLabel = catEl?.selectedOptions?.[0]?.textContent ?? categoryValue
  const summary = el('summary')?.value ?? ''
  const steps = el('steps')?.value ?? ''

  const diag = await buildDiagnostics()
  const diagCompact = JSON.stringify(diag) // compact to reduce URL length

  const prefillUrl = buildGoogleFormPrefillUrl({
    baseUrl: REPORT_FORM_URL,
    entryIds: REPORT_FORM_ENTRY_IDS,
    values: {
      category: categoryLabel,
      summary,
      steps,
      diagnostics: diagCompact,
    },
  })

  chrome.tabs.create({ url: prefillUrl })
  setStatus('Opened prefilled form. Submit it in the new tab.')
}

async function copyDiagnostics() {
  try {
    const diag = await buildDiagnostics()
    await navigator.clipboard.writeText(JSON.stringify(diag, null, 2))
    setStatus('Diagnostics copied to clipboard.')
  } catch (e) {
    setStatus('Failed to copy diagnostics. Try again.')
  }
}

async function init() {
  // Fill pills
  try {
    const manifest = chrome.runtime.getManifest()
    const tab = await getActiveTab()
    const host = safeHostname(tab?.url)
    if (el('sitePill')) el('sitePill').textContent = `Site: ${host || '—'}`
    if (el('versionPill')) el('versionPill').textContent = `v${manifest?.version || '—'}`
  } catch {
    // ignore
  }

  const openLink = el('openFormLink')
  if (openLink) {
    openLink.href = REPORT_FORM_URL && !REPORT_FORM_URL.includes('REPLACE_ME') ? REPORT_FORM_URL : '#'
  }

  if (!formConfigured()) {
    setStatus('Admin setup needed: set REPORT_FORM_URL + REPORT_FORM_ENTRY_IDS in report.js.')
  }

  el('submitBtn')?.addEventListener('click', async (e) => {
    e.preventDefault()
    await submitReport()
  })

  el('openFormBtn')?.addEventListener('click', (e) => {
    e.preventDefault()
    openForm()
  })

  el('copyDiagBtn')?.addEventListener('click', async (e) => {
    e.preventDefault()
    await copyDiagnostics()
  })
}

init()

