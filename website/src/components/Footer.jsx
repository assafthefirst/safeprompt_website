import { ExternalLink, Mail } from 'lucide-react';

const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/safeprompt-ai-privacy-ano/dfblkeoplcgpnfdcdnoikopfmfpkpphp';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-6 py-12 sm:px-12 lg:px-24">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-sm text-slate-600">
            Version 1.1.0 (Free Beta) — Watermark on restored text. Upgrade coming soon!
          </p>
          <a
            href="mailto:assafadi1@gmail.com"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            <Mail className="h-4 w-4" aria-hidden />
            assafadi1@gmail.com
          </a>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-6">
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Chrome Web Store
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
          <a
            href="/privacy.html"
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Privacy Policy
          </a>
        </nav>
      </div>
    </footer>
  );
}
