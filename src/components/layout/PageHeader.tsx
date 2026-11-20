import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { goBack } from '../../lib/router';

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: string }) {
  return (
    <header className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-3 sm:mb-7">
      <div className="min-w-[13rem] flex-1">
        {back && (
          <button
            type="button"
            onClick={() => goBack(back)}
            className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 font-semibold text-olive-700 hover:bg-olive-50"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
            Back
          </button>
        )}
        <h1 className="text-[1.75rem] font-extrabold leading-tight text-charcoal sm:text-3xl">{title}</h1>
        {subtitle && <div className="mt-1 text-[0.95rem] text-stone-warm">{subtitle}</div>}
      </div>
      {actions && <div className="flex max-w-full shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className} aria-label={title}>
      <div className="mb-3 flex min-h-10 items-center justify-between gap-3">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
