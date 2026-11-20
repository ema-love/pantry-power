import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ icon: Icon, title, children, action, compact }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-3 rounded-full bg-sage/25" aria-hidden />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-olive-100 text-olive-600">
          <Icon className="h-8 w-8" strokeWidth={1.8} aria-hidden />
        </div>
      </div>
      <h3 className="text-lg font-bold text-charcoal">{title}</h3>
      {children && <div className="mt-1.5 max-w-sm text-[0.95rem] leading-relaxed text-stone-warm">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
