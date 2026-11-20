import { useMemo, useState, type FormEvent } from 'react';
import { Link2 } from 'lucide-react';
import type { ShoppingListItem } from '../../types';
import { useStore } from '../../state/store';
import { useActions } from '../../state/useActions';
import { lookupCatalog } from '../../lib/catalog';
import { formatNumber, formatQty } from '../../lib/format';
import { suggestedRestockQuantity } from '../../lib/stock';
import { hasErrors, parseQuantity, validateName } from '../../lib/validation';
import { Button } from '../ui/Button';
import { QuantityField, TextField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';
import { CategoryPicker, UnitPicker } from '../pantry/Pickers';

export function ShoppingFormSheet({ open, onClose, entry, fromItemId }: { open: boolean; onClose: () => void; entry?: ShoppingListItem; fromItemId?: string }) {
  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Edit shopping item' : 'Add to shopping list'}>
      {open && <ShoppingForm key={entry?.id ?? fromItemId ?? 'new'} entry={entry} fromItemId={fromItemId} onDone={onClose} />}
    </Sheet>
  );
}

function ShoppingForm({ entry, fromItemId, onDone }: { entry?: ShoppingListItem; fromItemId?: string; onDone: () => void }) {
  const { data } = useStore();
  const actions = useActions();
  const fromItem = fromItemId ? data.items.find((i) => i.id === fromItemId) : undefined;

  const [name, setName] = useState(entry?.name ?? fromItem?.name ?? '');
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? fromItem?.categoryId ?? '');
  const [quantity, setQuantity] = useState(
    entry ? formatNumber(entry.quantity).replace(/,/g, '') : fromItem ? String(suggestedRestockQuantity(fromItem)) : '1',
  );
  const [unit, setUnit] = useState(entry?.unit ?? fromItem?.unit ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState({ category: Boolean(entry || fromItem), unit: Boolean(entry || fromItem) });

  // Link to a pantry item with the same name so buying it can top up stock.
  const linked = useMemo(() => {
    if (entry?.linkedPantryItemId) return data.items.find((i) => i.id === entry.linkedPantryItemId);
    if (fromItem) return fromItem;
    const n = name.trim().toLowerCase();
    return n ? data.items.find((i) => i.name.toLowerCase() === n) : undefined;
  }, [data.items, entry, fromItem, name]);

  const onNameChange = (value: string) => {
    setName(value);
    setErrors((e) => ({ ...e, name: undefined }));
    if (entry || fromItem) return;
    const pantryMatch = data.items.find((i) => i.name.toLowerCase() === value.trim().toLowerCase());
    const match = pantryMatch ? { categoryId: pantryMatch.categoryId, unit: pantryMatch.unit } : lookupCatalog(value);
    if (match) {
      if (!touched.category) setCategoryId(match.categoryId);
      if (!touched.unit) setUnit(match.unit);
    }
  };

  const alreadyOnList =
    !entry && linked ? data.shoppingList.find((s) => s.linkedPantryItemId === linked.id && !s.isCompleted) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = parseQuantity(quantity);
    const next = {
      name: validateName(name, 'Item name'),
      categoryId: categoryId ? undefined : 'Choose a category',
      unit: unit ? undefined : 'Choose a unit',
      quantity: typeof q === 'string' ? q : undefined,
      notes: notes.length > 500 ? 'Notes must be 500 characters or fewer' : undefined,
    };
    setErrors(next);
    if (hasErrors(next) || typeof q === 'string') return;
    const input = {
      name: name.trim(),
      categoryId,
      quantity: q,
      unit,
      notes: notes.trim(),
      linkedPantryItemId: linked?.id ?? null,
    };
    if (entry) actions.updateShoppingEntry(entry.id, input);
    else actions.addShoppingEntry(input);
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5 pb-2">
      {fromItem ? (
        <div className="rounded-2xl bg-cream/70 px-4 py-3">
          <p className="font-bold text-charcoal">{fromItem.name}</p>
          <p className="text-sm text-stone-warm">You have {formatQty(fromItem.quantity, fromItem.unit, data.units)} at home</p>
        </div>
      ) : (
        <div>
          <TextField
            label="What do you need?"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            error={errors.name}
            placeholder="e.g. Curry powder"
            autoComplete="off"
            maxLength={60}
            list="pantry-item-names"
          />
          <datalist id="pantry-item-names">
            {data.items.map((i) => (
              <option key={i.id} value={i.name} />
            ))}
          </datalist>
          {linked && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-olive-700">
              <Link2 className="h-4 w-4" aria-hidden />
              Linked to {linked.name} in your pantry ({formatQty(linked.quantity, linked.unit, data.units)} left)
            </p>
          )}
          {alreadyOnList && (
            <p className="mt-2 rounded-xl bg-amber-soft px-3 py-2 text-sm text-amber-deep">
              {alreadyOnList.name} is already on your list ({formatQty(alreadyOnList.quantity, alreadyOnList.unit, data.units)}).
            </p>
          )}
        </div>
      )}

      {!fromItem && (
        <CategoryPicker
          value={categoryId}
          error={errors.categoryId}
          onChange={(id) => {
            setCategoryId(id);
            setTouched((t) => ({ ...t, category: true }));
            setErrors((e) => ({ ...e, categoryId: undefined }));
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <QuantityField label="How much to buy" value={quantity} onChange={(v) => { setQuantity(v); setErrors((e) => ({ ...e, quantity: undefined })); }} error={errors.quantity} />
        <UnitPicker
          value={unit}
          error={errors.unit}
          onChange={(id) => {
            setUnit(id);
            setTouched((t) => ({ ...t, unit: true }));
            setErrors((e) => ({ ...e, unit: undefined }));
          }}
        />
      </div>
      {linked && unit && linked.unit !== unit && (
        <p className="-mt-2 text-sm text-stone-warm">
          Tip: your pantry counts {linked.name} in {data.units.find((u) => u.id === linked.unit)?.plural ?? linked.unit}. Use the same unit so stock can update automatically after shopping.
        </p>
      )}

      <TextField label="Note" optional value={notes} onChange={(e) => setNotes(e.target.value)} error={errors.notes} placeholder="e.g. Brand, size, where to buy" maxLength={500} />

      <div className="sticky bottom-0 -mx-5 border-t border-line/70 bg-ivory px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:px-6">
        <Button type="submit" size="lg" block>
          {entry ? 'Save changes' : 'Add to list'}
        </Button>
      </div>
    </form>
  );
}
