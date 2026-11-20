import { useMemo } from 'react';
import {
  ArrowDownRight, ArrowUpRight, CalendarClock, CalendarPlus, MapPin, Minus, PackageX, Pencil, Plus, ShoppingBasket,
  SlidersHorizontal, StickyNote, Tag, Trash2, TriangleAlert, type LucideIcon,
} from 'lucide-react';
import type { StockTransaction } from '../types';
import { useStore } from '../state/store';
import { useActions } from '../state/useActions';
import { toItemViews } from '../state/selectors';
import { useSheets } from '../components/AppSheets';
import { PageHeader, Section } from '../components/layout/PageHeader';
import { CategoryArt } from '../components/pantry/CategoryArt';
import { Button, ButtonLink } from '../components/ui/Button';
import { DemoBadge, ExpiryBadge, StockBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { findCategory } from '../lib/categories';
import { formatDate, formatTimestamp } from '../lib/dates';
import { formatNumber, formatQty } from '../lib/format';
import { unitLabel } from '../lib/units';
import { navigate } from '../lib/router';

const TX_META: Record<StockTransaction['transactionType'], { label: string; icon: LucideIcon; tone: string }> = {
  addition: { label: 'Added', icon: ArrowUpRight, tone: 'bg-olive-100 text-olive-700' },
  consumption: { label: 'Used', icon: ArrowDownRight, tone: 'bg-terracotta-50 text-terracotta-600' },
  adjustment: { label: 'Corrected', icon: SlidersHorizontal, tone: 'bg-cream text-stone-warm' },
};

export function ItemDetailPage({ id }: { id: string }) {
  const { data } = useStore();
  const actions = useActions();
  const sheets = useSheets();
  const item = useMemo(() => toItemViews(data).find((i) => i.id === id), [data, id]);
  const history = useMemo(
    () => data.transactions.filter((t) => t.itemId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
    [data.transactions, id],
  );

  if (!item) {
    return (
      <>
        <PageHeader title="Item not found" back="/pantry" />
        <div className="card">
          <EmptyState icon={PackageX} title="This item isn't in your pantry" action={<ButtonLink to="/pantry">Go to My Pantry</ButtonLink>}>
            It may have been deleted.
          </EmptyState>
        </div>
      </>
    );
  }

  const category = findCategory(data.categories, item.categoryId);
  const listEntry = data.shoppingList.find((s) => s.linkedPantryItemId === item.id && !s.isCompleted);
  const fmt = (n: number) => formatQty(n, item.unit, data.units);

  const details: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Tag, label: 'Category', value: category.name },
    { icon: TriangleAlert, label: 'Warn me at', value: item.minimumStock > 0 ? fmt(item.minimumStock) : 'Not set' },
    { icon: CalendarClock, label: 'Expiry date', value: item.expiryDate ? formatDate(item.expiryDate, { withYear: true }) : 'Not recorded' },
    { icon: CalendarPlus, label: 'Last bought', value: item.purchaseDate ? formatDate(item.purchaseDate, { withYear: true }) : 'Not recorded' },
    { icon: MapPin, label: 'Kept in', value: item.storageLocation || 'Not recorded' },
  ];

  return (
    <>
      <PageHeader
        back="/pantry"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {item.name} {item.isDemo && <DemoBadge />}
          </span>
        }
        actions={
          <Button variant="secondary" icon={Pencil} onClick={() => sheets.openItemForm(item.id)}>
            Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <section className="card p-5" aria-label="Current stock">
            <div className="flex items-center gap-5">
              <CategoryArt category={category} image={item.image} size="lg" alt={item.name} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-warm">In stock now</p>
                <p className="tabular mt-0.5 leading-none">
                  <span className="text-5xl font-extrabold text-charcoal">{formatNumber(item.quantity)}</span>{' '}
                  <span className="text-lg font-semibold text-stone-warm">{unitLabel(data.units, item.unit, item.quantity)}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <StockBadge status={item.stockStatus} />
                  <ExpiryBadge status={item.expiryStatus} date={item.expiryDate} />
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button size="lg" variant="secondary" icon={Minus} onClick={() => sheets.openStock(item.id, 'consumption')} disabled={item.quantity <= 0}>
                Use stock
              </Button>
              <Button size="lg" icon={Plus} onClick={() => sheets.openStock(item.id, 'addition')}>
                Add stock
              </Button>
            </div>
            <div className="mt-2">
              {listEntry ? (
                <ButtonLink to="/shopping" variant="ghost" block icon={ShoppingBasket}>
                  On your shopping list · {formatQty(listEntry.quantity, listEntry.unit, data.units)}
                </ButtonLink>
              ) : (
                <Button variant="ghost" block icon={ShoppingBasket} onClick={() => sheets.openShoppingForm({ fromItemId: item.id })}>
                  Add to shopping list
                </Button>
              )}
            </div>
          </section>

          <section className="card divide-y divide-line/70" aria-label="Details">
            {details.map((d) => (
              <div key={d.label} className="flex items-center gap-3 px-5 py-3.5">
                <d.icon className="h-5 w-5 shrink-0 text-stone-light" aria-hidden />
                <span className="flex-1 text-stone-warm">{d.label}</span>
                <span className="text-right font-semibold text-charcoal">{d.value}</span>
              </div>
            ))}
            {item.expiryDate && (
              <div className="px-5 py-2">
                <Button variant="ghost" size="sm" onClick={() => sheets.openExpiry(item.id)}>
                  Update expiry date
                </Button>
              </div>
            )}
            {item.notes && (
              <div className="flex gap-3 px-5 py-3.5">
                <StickyNote className="mt-0.5 h-5 w-5 shrink-0 text-stone-light" aria-hidden />
                <p className="whitespace-pre-wrap text-charcoal">{item.notes}</p>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <Section title="Stock history">
            {history.length === 0 ? (
              <p className="card px-5 py-6 text-center text-stone-warm">No changes recorded yet.</p>
            ) : (
              <ol className="card divide-y divide-line/70">
                {history.map((t) => {
                  const meta = TX_META[t.transactionType];
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
                        <meta.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-charcoal">
                          {meta.label} {formatQty(t.quantity, t.unit || item.unit, data.units)}
                        </p>
                        <p className="truncate text-sm text-stone-warm">
                          {formatTimestamp(t.date)}
                          {t.notes ? ` · ${t.notes}` : ''}
                        </p>
                      </div>
                      <span className="tabular shrink-0 text-sm font-semibold text-stone-warm" title="Stock after this change">
                        {formatNumber(t.balanceAfter)} left
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>

          <Button
            variant="ghost"
            icon={Trash2}
            className="text-danger hover:bg-danger-soft"
            onClick={async () => {
              if (await actions.deleteItem(item)) navigate('/pantry', { replace: true });
            }}
          >
            Delete this item
          </Button>
        </div>
      </div>
    </>
  );
}
