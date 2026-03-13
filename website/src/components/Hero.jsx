const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/safeprompt-ai-privacy-ano/dfblkeoplcgpnfdcdnoikopfmfpkpphp';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-900 px-6 py-24 text-white sm:px-12 lg:px-24">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="flex flex-col items-center gap-3">
          <span className="inline-flex items-center justify-center gap-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <img src="/safeprompt_website/logo-transparent.png" alt="SafePrompt logo" className="h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20" />
            SafePrompt
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-4 py-1.5 text-sm font-normal text-slate-300">
            AI Privacy & Anonymizer
          </span>
        </h1>
        <p className="mt-4 text-xl text-slate-300 sm:text-2xl">
          Protect PII & Sensitive Data in ChatGPT (and other LLM's) automatically. Stop leaking sensitive data to AI models.
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
