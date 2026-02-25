import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        popup: 'index.html',
        report: 'report.html',
        privacy: 'privacy.html',
        terms: 'terms.html',
        faq: 'faq.html',
      },
    },
  },
})
