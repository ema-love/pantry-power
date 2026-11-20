import type { ExpiryStatus, StockStatus } from '../../types';
import { STOCK_LABELS, expiryText } from '../../lib/stock';
import { CalendarClock, CircleAlert, CircleCheck, CircleDashed, TriangleAlert } from 'lucide-react';

const STOCK_STYLES: Record<StockStatus, string> = {
  in: 'bg-olive-100 text-olive-700',
  low: 'bg-amber-soft text-amber-deep',
  out: 'bg-danger-soft text-danger-deep',
};
const STOCK_ICONS = { in: CircleCheck, low: TriangleAlert, out: CircleDashed };

export function StockBadge({ status, className = '' }: { status: StockStatus; className?: string }) {
  const Icon = STOCK_ICONS[status];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${STOCK_STYLES[status]} ${className}`}>
      <Icon aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
      {STOCK_LABELS[status]}
    </span>
  );
}

export function ExpiryBadge({ status, date, className = '' }: { status: ExpiryStatus; date: string | null; className?: string }) {
  if (!date || status === 'none' || status === 'ok') return null;
  const style =
    status === 'expired' ? 'bg-danger-soft text-danger-deep' : status === 'week' ? 'bg-amber-soft text-amber-deep' : 'bg-cream text-stone-warm';
  const Icon = status === 'expired' ? CircleAlert : CalendarClock;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${style} ${className}`}>
      <Icon aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
      {expiryText(date)}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-terracotta/60 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-terracotta-600">
      Demo
    </span>
  );
}
