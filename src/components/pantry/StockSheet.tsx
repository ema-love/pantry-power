import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import type { PantryItem } from '../../types';
import { useStore } from '../../state/store';
import { useActions } from '../../state/useActions';
import { formatNumber, formatQty, roundQty } from '../../lib/format';
import { getStockStatus } from '../../lib/stock';
import { today } from '../../lib/dates';
import { parseQuantity, validateOptionalDate } from '../../lib/validation';
import { findCategory } from '../../lib/categories';
import { Button } from '../ui/Button';
import { DateField, QuantityField, TextField } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { Sheet } from '../ui/Sheet';
import { StockBadge } from '../ui/Badge';
import { CategoryArt } from './CategoryArt';

export type StockKind = 'addition' | 'consumption';

export function StockSheet({ open, onClose, item, initialKind }: { open: boolean; onClose: () => void; item?: PantryItem; initialKind: StockKind }) {
  return (
    <Sheet open={open} onClose={onClose} title={item ? item.name : 'Update stock'} description="Record what you used or bought.">
      {open && item && <StockForm key={`${item.id}-${initialKind}`} item={item} initialKind={initialKind} onDone={onClose} />}
    </Sheet>
  );
}

function StockForm({ item, initialKind, onDone }: { item: PantryItem; initialKind: StockKind; onDone: () => void }) {
  const { data } = useStore();
  const actions = useActions();
  const [kind, setKind] = useState<StockKind>(item.quantity <= 0 ? 'addition' : initialKind);
  const [amount, setAmount] = useState('1');
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const [dateError, setDateError] = useState<string>();

  const fmt = (n: number) => formatQty(n, item.unit, data.units);
  const unitName = data.units.find((u) => u.id === item.unit)?.plural ?? item.unit;
  const category = findCategory(data.categories, item.categoryId);

  const parsed = parseQuantity(amount, { label: 'Amount' });
  const preview = useMemo(() => {
    if (typeof parsed === 'string') return null;
    const next = roundQty(kind === 'addition' ? item.quantity + parsed : item.quantity - parsed);
    return next;
  }, [parsed, kind, item.quantity]);

  const quickAmounts =
    kind === 'consumption'
      ? [1, 2, 5].filter((n) => n < item.quantity)
      : [1, 2, 5, 10];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (typeof parsed === 'string') return setError(parsed);
    if (kind === 'consumption' && parsed > item.quantity) {
      return setError(`You only have ${fmt(item.quantity)}. Tap "All of it" if you've finished it.`);
    }
    if (kind === 'addition') {
      const de = validateOptionalDate(purchaseDate, { label: 'Purchase date', notInFuture: true });
      if (de) return setDateError(de);
    }
    actions.changeStock(item, kind, parsed, notes.trim().slice(0, 200), kind === 'addition' ? purchaseDate || null : null);
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5 pb-2">
      <div className="flex items-center gap-4 rounded-2xl bg-cream/70 p-3.5">
        <CategoryArt category={category} image={item.image} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-stone-warm">You have</p>
          <p className="tabular text-xl font-extrabold text-charcoal">{fmt(item.quantity)}</p>
        </div>
        <StockBadge status={getStockStatus(item)} />
      </div>

      <Segmented
        label="What happened?"
        value={kind}
        onChange={(k) => {
          setKind(k);
          setError(undefined);
        }}
        options={[
          { value: 'consumption', label: 'I used some' },
          { value: 'addition', label: 'I bought more' },
        ]}
      />

      {kind === 'consumption' && item.quantity <= 0 ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-danger-deep">There's none left to use. Switch to "I bought more" when you restock.</p>
      ) : (
        <>
          <div>
            <QuantityField
              label={kind === 'consumption' ? `How much did you use? (${unitName})` : `How much did you buy? (${unitName})`}
              value={amount}
              onChange={(v) => {
                setAmount(v);
                setError(undefined);
              }}
              error={error}
              max={kind === 'consumption' ? item.quantity : undefined}
            />
            <div className="mt-2.5 flex flex-wrap gap-2">
              {quickAmounts.map((n) => (
                <button key={n} type="button" className={`chip ${String(n) === amount ? 'chip-on' : 'chip-off'}`} onClick={() => { setAmount(String(n)); setError(undefined); }}>
                  {formatNumber(n)}
                </button>
              ))}
              {kind === 'consumption' && item.quantity > 1 && (
                <button type="button" className="chip chip-off" onClick={() => { setAmount(formatNumber(roundQty(item.quantity / 2)).replace(/,/g, '')); setError(undefined); }}>
                  Half
                </button>
              )}
              {kind === 'consumption' && (
                <button type="button" className={`chip ${Number(amount) === item.quantity ? 'chip-on' : 'chip-off'}`} onClick={() => { setAmount(formatNumber(item.quantity).replace(/,/g, '')); setError(undefined); }}>
                  All of it
                </button>
              )}
            </div>
          </div>

          {kind === 'addition' && (
            <DateField label="Date bought" optional value={purchaseDate} onChange={(v) => { setPurchaseDate(v); setDateError(undefined); }} error={dateError} max={today()} />
          )}

          <TextField
            label="Note"
            optional
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={kind === 'addition' ? 'e.g. Bought at Oyingbo market' : 'e.g. Sunday jollof'}
            maxLength={200}
          />

          {preview !== null && preview >= 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-white/70 px-4 py-3" aria-live="polite">
              <span className="tabular text-stone-warm">{fmt(item.quantity)}</span>
              <ArrowRight className="h-4 w-4 text-stone-light" aria-hidden />
              <span className="tabular text-lg font-extrabold text-charcoal">{fmt(preview)}</span>
              <StockBadge status={getStockStatus({ quantity: preview, minimumStock: item.minimumStock })} className="ml-auto" />
            </div>
          )}

          <div className="sticky bottom-0 -mx-5 border-t border-line/70 bg-ivory px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:px-6">
            <Button type="submit" size="lg" block variant={kind === 'consumption' ? 'primary' : 'accent'}>
              {typeof parsed === 'number'
                ? kind === 'consumption' ? `Use ${fmt(parsed)}` : `Add ${fmt(parsed)}`
                : kind === 'consumption' ? 'Use stock' : 'Add stock'}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
