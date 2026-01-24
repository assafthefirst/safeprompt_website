export function buildGoogleFormPrefillUrl({
  baseUrl,
  entryIds,
  values,
}) {
  const url = String(baseUrl || '')
  if (!url) throw new Error('baseUrl required')
  if (!/^https:\/\/docs\.google\.com\/forms\/d\/e\//.test(url)) {
    throw new Error('baseUrl must be a Google Forms "viewform" URL')
  }

  const u = new URL(url)
  // Ensure we’re in prefill mode
  u.searchParams.set('usp', 'pp_url')

  for (const [k, entryId] of Object.entries(entryIds || {})) {
    if (!entryId) continue
    const v = values?.[k]
    if (v == null) continue
    const key = `entry.${entryId}`
    u.searchParams.set(key, String(v))
  }

  return u.toString()
}

