import { Zap } from 'lucide-react';

export default function HowItWorks() {
  return (
    <section className="bg-white px-6 py-16 sm:px-12 lg:px-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          How it works
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-slate-600">
          SafePrompt serves as a secure firewall between your browser and ChatGPT (And other LLM's). It replaces sensitive data with realistic synthetic placeholders. The AI understands the context, but never sees the secrets. When the response arrives, the original data is instantly restored for your safe use.
        </p>
        <div className="mt-8 flex items-center gap-2 text-emerald-600">
          <Zap className="h-5 w-5" aria-hidden />
          <span className="font-medium">Everything happens instantly in your browser, no data collected by anyone.</span>
        </div>
      </div>
    </section>
  );
}
