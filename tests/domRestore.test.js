import { describe, it, expect } from 'vitest'
import { restoreInDomSubtree, ensureWatermarkOnce, WATERMARK_TEXT } from '../src/engine/restore.js'

describe('DOM restore', () => {
  it('restores tokens in text nodes without destroying HTML structure', () => {
    document.body.innerHTML = `
      <article>
        <h2>Title</h2>
        <p>Hello <strong>[[SP_NAME_1]]</strong></p>
        <ul><li>Call [[SP_PHONE_1]]</li></ul>
      </article>
    `
    const tokenToReal = { '[[SP_NAME_1]]': 'Garrett Carroll', '[[SP_PHONE_1]]': '054-9876543' }
    const article = document.querySelector('article')
    const count = restoreInDomSubtree(article, tokenToReal)
    expect(count).toBeGreaterThan(0)
    expect(article.querySelector('strong')?.textContent).toBe('Garrett Carroll')
    expect(article.querySelector('ul li')?.textContent).toContain('054-9876543')
    // HTML elements preserved
    expect(article.querySelector('h2')?.textContent).toBe('Title')
  })

  it('watermark marker prevents duplicates', () => {
    document.body.innerHTML = `<article><p>Answer</p></article>`
    const article = document.querySelector('article')
    ensureWatermarkOnce(article, { isPremium: false })
    ensureWatermarkOnce(article, { isPremium: false })
    const marks = article.querySelectorAll('[data-safeprompt-watermark="1"]')
    expect(marks.length).toBe(1)
    expect(article.textContent).toContain(WATERMARK_TEXT)
  })
})

