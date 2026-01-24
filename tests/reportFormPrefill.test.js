import { describe, it, expect } from 'vitest'
import { buildGoogleFormPrefillUrl } from '../src/reportFormPrefill.js'

describe('report form prefill', () => {
  it('builds a Google Forms prefill URL with entry.* params and usp=pp_url', () => {
    const url = buildGoogleFormPrefillUrl({
      baseUrl: 'https://docs.google.com/forms/d/e/TEST_FORM_ID/viewform',
      entryIds: { category: '111', summary: '222', diagnostics: '333' },
      values: { category: 'UI issue', summary: 'buttons missing', diagnostics: '{"k":1}' },
    })

    expect(url).toContain('https://docs.google.com/forms/d/e/TEST_FORM_ID/viewform')
    expect(url).toContain('usp=pp_url')
    expect(url).toContain('entry.111=')
    expect(url).toContain('entry.222=')
    expect(url).toContain('entry.333=')
  })

  it('throws for non-Google base URLs', () => {
    expect(() =>
      buildGoogleFormPrefillUrl({
        baseUrl: 'https://example.com',
        entryIds: { summary: '1' },
        values: { summary: 'x' },
      })
    ).toThrow()
  })
})

