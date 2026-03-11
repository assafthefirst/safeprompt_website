import {
  Shield,
  RefreshCw,
  Code2,
  Brain,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Smart Sanitization',
    description: 'Automatically detects and masks Names, Emails, Phone Numbers, Credit Cards, IBANs, SSNs, Israeli IDs, and IP addresses.',
  },
  {
    icon: RefreshCw,
    title: 'Seamless Restoration',
    description: 'You see the original data in the final answer; the AI sees only fake data.',
  },
  {
    icon: Code2,
    title: 'Code Safe',
    description: 'Works inside JSON, SQL queries, and URLs without breaking syntax.',
  },
  {
    icon: Brain,
    title: 'Context Aware',
    description: 'Uses NLP to identify names and entities accurately.',
  },
  {
    icon: Zap,
    title: 'Zero Latency',
    description: 'Everything happens instantly in your browser, no data collected by anyone.',
  },
];

export default function Features() {
  return (
    <section className="bg-slate-50 px-6 py-16 sm:px-12 lg:px-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          Key Features
        </h2>
        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-slate-600">
                {description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
