import { Shield } from 'lucide-react';

const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/safeprompt-ai-privacy-ano/dfblkeoplcgpnfdcdnoikopfmfpkpphp';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-900 px-6 py-24 text-white sm:px-12 lg:px-24">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-4 py-1.5 text-sm text-slate-300">
          <Shield className="h-4 w-4 text-emerald-400" aria-hidden />
          AI Privacy & Anonymizer
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          SafePrompt
        </h1>
        <p className="mt-4 text-xl text-slate-300 sm:text-2xl">
          Protect PII & Sensitive Data in ChatGPT automatically. Stop leaking sensitive data to AI models.
        </p>
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Add to Chrome
        </a>
      </div>
    </section>
  );
}
