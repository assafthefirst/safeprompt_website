import { Scale, Users, DollarSign, Wrench } from 'lucide-react';

const audiences = [
  {
    icon: Scale,
    title: 'Legal',
    description: 'Draft contracts without revealing client names.',
  },
  {
    icon: Users,
    title: 'HR',
    description: 'Analyze resumes without exposing IDs or contact info.',
  },
  {
    icon: DollarSign,
    title: 'Finance',
    description: 'Process reports masking Credit Cards and Bank Accounts.',
  },
  {
    icon: Wrench,
    title: 'DevOps',
    description: 'Debug logs masking IPs and Secrets.',
  },
];

export default function TargetAudience() {
  return (
    <section className="bg-white px-6 py-16 sm:px-12 lg:px-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          Perfect for
        </h2>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {audiences.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="mt-1 text-slate-600">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
