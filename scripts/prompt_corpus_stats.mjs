import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { detectPII, sanitize } from '../src/engine/sanitize.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const corpusArgs = process.argv.slice(2)
const corpusPaths =
  corpusArgs.length > 0
    ? corpusArgs.map((p) => (path.isAbsolute(p) ? p : path.join(process.cwd(), p)))
    : [path.join(__dirname, 'prompt_corpus_20.json')]

function countTokenTypes(s) {
  const counts = {}
  const re = /\[\[SP_([A-Z0-9_]+)_\d+\]\]/g
  let m
  while ((m = re.exec(s))) {
    const type = m[1]
    counts[type] = (counts[type] ?? 0) + 1
  }
  return counts
}

function addToMapList(map, key, value) {
  if (!map[key]) map[key] = []
  map[key].push(value)
}

function analyzeCorpus(corpus, corpusPath) {
  const summary = {
    corpusPath,
    total: corpus.length,
    detect: { detected: 0, notDetected: 0, byReason: {}, byReasonFP: {}, byReasonTP: {} },
    sanitize: { totalItemsFound: 0, byTokenType: {}, byTokenTypeFP: {}, byTokenTypeTP: {} },
    confusion: { tp: 0, fp: 0, tn: 0, fn: 0 },
    perPrompt: [],
  }

  for (const p of corpus) {
    const det = detectPII(p.text, { mode: 'warn' })
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const san = sanitize(p.text, state, { protectionActive: true })
    const tokenCounts = countTokenTypes(san.cleanText)

    summary.sanitize.totalItemsFound += san.itemsFound

    // detect counters
    if (det.detected) summary.detect.detected++
    else summary.detect.notDetected++

    for (const r of det.reasons ?? []) {
      addToMapList(summary.detect.byReason, r, p.id)
      if (p.expected === 'fp') addToMapList(summary.detect.byReasonFP, r, p.id)
      if (p.expected === 'tp') addToMapList(summary.detect.byReasonTP, r, p.id)
    }

    // sanitize counters by token type
    for (const [t, c] of Object.entries(tokenCounts)) {
      addToMapList(summary.sanitize.byTokenType, t, p.id)
      if (p.expected === 'fp') addToMapList(summary.sanitize.byTokenTypeFP, t, p.id)
      if (p.expected === 'tp') addToMapList(summary.sanitize.byTokenTypeTP, t, p.id)
      // keep ids for debug; totals are computed separately
      void c
    }

    // confusion matrix (warn flow)
    if (p.expected === 'tp' && det.detected) summary.confusion.tp++
    else if (p.expected === 'tp' && !det.detected) summary.confusion.fn++
    else if (p.expected === 'fp' && det.detected) summary.confusion.fp++
    else if (p.expected === 'fp' && !det.detected) summary.confusion.tn++

    summary.perPrompt.push({
      id: p.id,
      category: p.category,
      expected: p.expected,
      detect: { detected: det.detected, reasons: det.reasons ?? [] },
      sanitize: { itemsFound: san.itemsFound, tokenTypes: Object.keys(tokenCounts) },
    })
  }

  return summary
}

function mapToCountsAndIds(map) {
  const out = []
  for (const [k, ids] of Object.entries(map)) {
    out.push({ key: k, count: ids.length, ids })
  }
  out.sort((a, b) => b.count - a.count)
  return out
}

function tokenTypeTotalsForCorpus(corpus) {
  const tokenTypeTotals = {}
  for (const p of corpus) {
    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const san = sanitize(p.text, state, { protectionActive: true })
    const tokenCounts = countTokenTypes(san.cleanText)
    for (const [t, c] of Object.entries(tokenCounts)) tokenTypeTotals[t] = (tokenTypeTotals[t] ?? 0) + c
  }
  return Object.entries(tokenTypeTotals)
    .map(([t, c]) => ({ type: t, count: c }))
    .sort((a, b) => b.count - a.count)
}

function printSummary(summary, tokenTotalsSorted) {
  const byReason = mapToCountsAndIds(summary.detect.byReason)
  const byReasonFP = mapToCountsAndIds(summary.detect.byReasonFP)
  const byReasonTP = mapToCountsAndIds(summary.detect.byReasonTP)

  console.log(`=== Prompt Corpus Stats (${summary.total}) ===`)
  console.log(`Corpus file: ${summary.corpusPath}`)
  console.log(`Total prompts: ${summary.total}`)
  console.log('')
  console.log('--- detectPII (warn flow) ---')
  console.log(`Detected: ${summary.detect.detected}, Not detected: ${summary.detect.notDetected}`)
  console.log(
    `Confusion (vs expected labels): TP=${summary.confusion.tp} FP=${summary.confusion.fp} TN=${summary.confusion.tn} FN=${summary.confusion.fn}`
  )
  console.log('')
  console.log('Top reasons (all):')
  for (const row of byReason.slice(0, 15)) console.log(`- ${row.key}: ${row.count}`)
  console.log('')
  console.log('Top reasons in FP-labeled prompts (best FP-hardening targets):')
  for (const row of byReasonFP.slice(0, 15)) console.log(`- ${row.key}: ${row.count} (e.g. ${row.ids.slice(0, 3).join(', ')})`)
  console.log('')
  console.log('Top reasons in TP-labeled prompts:')
  for (const row of byReasonTP.slice(0, 15)) console.log(`- ${row.key}: ${row.count}`)

  console.log('')
  console.log('--- sanitize (tokenization) ---')
  console.log(`Total itemsFound (sum): ${summary.sanitize.totalItemsFound}`)
  console.log('Token type totals (by occurrences in sanitized output):')
  for (const row of tokenTotalsSorted.slice(0, 20)) console.log(`- ${row.type}: ${row.count}`)

  console.log('')
  console.log('--- Per-prompt summary ---')
  for (const p of summary.perPrompt) {
    console.log(
      `${p.id} [${p.expected}] detect=${p.detect.detected ? 'Y' : 'N'} reasons=${p.detect.reasons.join('|') || '-'} tokens=${p.sanitize.tokenTypes.join('|') || '-'} itemsFound=${p.sanitize.itemsFound}`
    )
  }
}

function mergeIdMaps(dst, src) {
  for (const [k, ids] of Object.entries(src)) {
    if (!dst[k]) dst[k] = []
    dst[k].push(...ids)
  }
}

function mergeSummaries(dst, src) {
  dst.total += src.total
  dst.detect.detected += src.detect.detected
  dst.detect.notDetected += src.detect.notDetected
  dst.sanitize.totalItemsFound += src.sanitize.totalItemsFound
  dst.confusion.tp += src.confusion.tp
  dst.confusion.fp += src.confusion.fp
  dst.confusion.tn += src.confusion.tn
  dst.confusion.fn += src.confusion.fn
  mergeIdMaps(dst.detect.byReason, src.detect.byReason)
  mergeIdMaps(dst.detect.byReasonFP, src.detect.byReasonFP)
  mergeIdMaps(dst.detect.byReasonTP, src.detect.byReasonTP)
  // perPrompt intentionally omitted in aggregate
}

function readCorpusFromPath(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

const perCorpus = []
for (const corpusPath of corpusPaths) {
  const corpus = readCorpusFromPath(corpusPath)
  const summary = analyzeCorpus(corpus, corpusPath)
  const tokenTotalsSorted = tokenTypeTotalsForCorpus(corpus)
  perCorpus.push({ corpus, summary, tokenTotalsSorted })
}

function coverageForCorpus(corpus) {
  const cov = {
    warn: { expected: {}, hit: {} },
    sanitize: { expected: {}, hit: {} },
    perPromptMisses: [],
  }

  function inc(map, k, by = 1) {
    map[k] = (map[k] ?? 0) + by
  }

  for (const p of corpus) {
    const expectedTypes = Array.isArray(p.expectedTokenTypes) ? p.expectedTokenTypes : null
    if (!expectedTypes || expectedTypes.length === 0) continue

    const det = detectPII(p.text, { mode: 'warn' })
    const detTypes = new Set(det.types ?? [])

    const state = { tokenToReal: {}, realToToken: {}, tokenCounters: {} }
    const san = sanitize(p.text, state, { protectionActive: true })
    const tokenCounts = countTokenTypes(san.cleanText)
    const sanTypes = new Set(Object.keys(tokenCounts))

    const missWarn = []
    const missSan = []

    for (const t of expectedTypes) {
      inc(cov.warn.expected, t)
      inc(cov.sanitize.expected, t)

      if (detTypes.has(t)) inc(cov.warn.hit, t)
      else missWarn.push(t)

      if (sanTypes.has(t)) inc(cov.sanitize.hit, t)
      else missSan.push(t)
    }

    if (missWarn.length || missSan.length) {
      cov.perPromptMisses.push({
        id: p.id,
        expectedTokenTypes: expectedTypes,
        missWarn,
        missSanitize: missSan,
      })
    }
  }

  return cov
}

function printCoverage(cov) {
  function rows(expected, hit) {
    const out = []
    for (const [t, exp] of Object.entries(expected)) {
      const h = hit[t] ?? 0
      out.push({ type: t, expected: exp, hit: h, miss: exp - h, pct: exp ? Math.round((h / exp) * 100) : 0 })
    }
    out.sort((a, b) => b.miss - a.miss || a.type.localeCompare(b.type))
    return out
  }

  const warnRows = rows(cov.warn.expected, cov.warn.hit)
  const sanRows = rows(cov.sanitize.expected, cov.sanitize.hit)

  console.log('')
  console.log('--- Coverage vs expectedTokenTypes ---')
  console.log('Warn coverage (by type):')
  for (const r of warnRows.slice(0, 20)) console.log(`- ${r.type}: ${r.hit}/${r.expected} (${r.pct}%) miss=${r.miss}`)
  console.log('SecureSend coverage (by type):')
  for (const r of sanRows.slice(0, 20)) console.log(`- ${r.type}: ${r.hit}/${r.expected} (${r.pct}%) miss=${r.miss}`)

  const missCount = cov.perPromptMisses.length
  if (missCount) {
    console.log('')
    console.log(`Per-prompt misses: ${missCount} (showing up to 10)`)
    for (const m of cov.perPromptMisses.slice(0, 10)) {
      console.log(`- ${m.id}: missWarn=${m.missWarn.join('|') || '-'} missSanitize=${m.missSanitize.join('|') || '-'}`)
    }
  }
}

for (const item of perCorpus) {
  printSummary(item.summary, item.tokenTotalsSorted)
  const cov = coverageForCorpus(item.corpus)
  printCoverage(cov)
  console.log('')
}

if (perCorpus.length > 1) {
  const agg = {
    corpusPath: 'AGGREGATE',
    total: 0,
    detect: { detected: 0, notDetected: 0, byReason: {}, byReasonFP: {}, byReasonTP: {} },
    sanitize: { totalItemsFound: 0, byTokenType: {}, byTokenTypeFP: {}, byTokenTypeTP: {} },
    confusion: { tp: 0, fp: 0, tn: 0, fn: 0 },
    perPrompt: [],
  }

  for (const item of perCorpus) mergeSummaries(agg, item.summary)

  // token totals for aggregate: sum per-corpus token totals
  const tokenTotalsAgg = {}
  for (const item of perCorpus) {
    for (const row of item.tokenTotalsSorted) tokenTotalsAgg[row.type] = (tokenTotalsAgg[row.type] ?? 0) + row.count
  }
  const tokenTotalsSortedAgg = Object.entries(tokenTotalsAgg)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  console.log('==============================')
  console.log('=== AGGREGATE (all corpora) ===')
  console.log('==============================')
  printSummary(agg, tokenTotalsSortedAgg)

  // coverage aggregate (only corpora entries that include expectedTokenTypes)
  const covAgg = { warn: { expected: {}, hit: {} }, sanitize: { expected: {}, hit: {} }, perPromptMisses: [] }
  function mergeCov(dst, src) {
    for (const [k, v] of Object.entries(src.warn.expected)) dst.warn.expected[k] = (dst.warn.expected[k] ?? 0) + v
    for (const [k, v] of Object.entries(src.warn.hit)) dst.warn.hit[k] = (dst.warn.hit[k] ?? 0) + v
    for (const [k, v] of Object.entries(src.sanitize.expected)) dst.sanitize.expected[k] = (dst.sanitize.expected[k] ?? 0) + v
    for (const [k, v] of Object.entries(src.sanitize.hit)) dst.sanitize.hit[k] = (dst.sanitize.hit[k] ?? 0) + v
    dst.perPromptMisses.push(...src.perPromptMisses)
  }
  for (const item of perCorpus) mergeCov(covAgg, coverageForCorpus(item.corpus))
  printCoverage(covAgg)
}

