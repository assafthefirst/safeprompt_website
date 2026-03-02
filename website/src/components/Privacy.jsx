import { Lock, Ban, Eye } from 'lucide-react';

const points = [
  {
    icon: Lock,
    title: 'Client-Side Only',
    description: 'All processing is done locally on your machine.',
  },
  {
    icon: Ban,
    title: 'No Data Collection',
    description: 'We do not store your prompts or your data. Nothing is sent to our servers.',
  },
  {
    icon: Eye,
    title: 'Open Transparency',
    description: 'Built for security-conscious professionals.',
  },
];

export default function Privacy() {
  return (
    <section className="bg-slate-900 px-6 py-16 text-white sm:px-12 lg:px-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Privacy & Security
        </h2>
        <p className="mt-2 text-slate-400">
          GDPR / CCPA / HIPAA conscious
        </p>
        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {points.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/50 text-emerald-400">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                {title}
              </h3>
              <p className="mt-2 text-slate-400">
                {description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
