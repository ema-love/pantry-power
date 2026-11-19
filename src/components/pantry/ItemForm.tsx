import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, ChevronDown, ImageOff, Info } from 'lucide-react';
import type { PantryItem } from '../../types';
import { useStore } from '../../state/store';
import { useActions } from '../../state/useActions';
import type { PantryItemInput } from '../../state/reducer';
import { lookupCatalog } from '../../lib/catalog';
import { findCategory } from '../../lib/categories';
import { imageFileToDataUrl } from '../../lib/image';
import { formatNumber } from '../../lib/format';
import { hasErrors, parseQuantity, validateName, validateOptionalDate } from '../../lib/validation';
import { today } from '../../lib/dates';
import { Button, Link } from '../ui/Button';
import { DateField, QuantityField, TextAreaField, TextField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';
import { CategoryArt } from './CategoryArt';
import { CategoryPicker, UnitPicker } from './Pickers';

const LOCATIONS = ['Pantry shelf', 'Kitchen cabinet', 'Fridge', 'Freezer', 'Store room', 'Countertop'];

interface FormState {
  name: string;
  categoryId: string;
  quantity: string;
  unit: string;
  minimumStock: string;
  expiryDate: string;
  purchaseDate: string;
  storageLocation: string;
  image: string | null;
  notes: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

function initialState(item?: PantryItem, preset?: Partial<FormState>): FormState {
  if (item) {
    return {
      name: item.name,
      categoryId: item.categoryId,
      quantity: formatNumber(item.quantity).replace(/,/g, ''),
      unit: item.unit,
      minimumStock: item.minimumStock ? formatNumber(item.minimumStock).replace(/,/g, '') : '',
      expiryDate: item.expiryDate ?? '',
      purchaseDate: item.purchaseDate ?? '',
      storageLocation: item.storageLocation,
      image: item.image,
      notes: item.notes,
    };
  }
  return {
    name: '',
    categoryId: '',
    quantity: '1',
    unit: '',
    minimumStock: '',
    expiryDate: '',
    purchaseDate: '',
    storageLocation: '',
    image: null,
    notes: '',
    ...preset,
  };
}

function validate(f: FormState): { errors: Errors; input?: PantryItemInput } {
  const errors: Errors = {};
  errors.name = validateName(f.name, 'Item name');
  if (!f.categoryId) errors.categoryId = 'Choose a category';
  if (!f.unit) errors.unit = 'Choose a unit';
  const quantity = parseQuantity(f.quantity, { allowZero: true });
  if (typeof quantity === 'string') errors.quantity = quantity;
  let minimumStock: number | string = 0;
  if (f.minimumStock.trim()) {
    minimumStock = parseQuantity(f.minimumStock, { allowZero: true, label: 'Minimum stock' });
    if (typeof minimumStock === 'string') errors.minimumStock = minimumStock;
  }
  errors.expiryDate = validateOptionalDate(f.expiryDate, { label: 'Expiry date' });
  errors.purchaseDate = validateOptionalDate(f.purchaseDate, { label: 'Purchase date', notInFuture: true });
  if (!errors.expiryDate && !errors.purchaseDate && f.expiryDate && f.purchaseDate && f.expiryDate < f.purchaseDate) {
    errors.expiryDate = 'Expiry date cannot be before the purchase date';
  }
  if (f.notes.length > 500) errors.notes = 'Notes must be 500 characters or fewer';
  if (f.storageLocation.length > 60) errors.storageLocation = 'Keep this under 60 characters';
  if (hasErrors(errors)) return { errors };
  return {
    errors: {},
    input: {
      name: f.name.trim(),
      categoryId: f.categoryId,
      quantity: quantity as number,
      unit: f.unit,
      minimumStock: minimumStock as number,
      expiryDate: f.expiryDate || null,
      purchaseDate: f.purchaseDate || null,
      storageLocation: f.storageLocation.trim(),
      image: f.image,
      notes: f.notes.trim(),
    },
  };
}

export function ItemFormSheet({ open, onClose, item, onSaved }: { open: boolean; onClose: () => void; item?: PantryItem; onSaved?: (id: string) => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? `Edit ${item.name}` : 'Add an item'}
      description={item ? undefined : 'Only the first four details are needed. You can add the rest later.'}
    >
      {open && <ItemForm key={item?.id ?? 'new'} item={item} onDone={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function ItemForm({ item, onDone, onSaved }: { item?: PantryItem; onDone: () => void; onSaved?: (id: string) => void }) {
  const { data } = useStore();
  const actions = useActions();
  const [form, setForm] = useState<FormState>(() => initialState(item));
  const [errors, setErrors] = useState<Errors>({});
  const [showMore, setShowMore] = useState(() => Boolean(item && (item.purchaseDate || item.storageLocation || item.image || item.notes)));
  const [imageError, setImageError] = useState<string>();
  const [imageBusy, setImageBusy] = useState(false);
  const touched = useRef({ category: Boolean(item), unit: Boolean(item) });
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Pre-fill category and unit for familiar items like "Rice" or "Tomato paste".
  useEffect(() => {
    if (item) return;
    const match = lookupCatalog(form.name);
    if (!match) return;
    setForm((f) => ({
      ...f,
      categoryId: touched.current.category ? f.categoryId : match.categoryId,
      unit: touched.current.unit ? f.unit : match.unit,
    }));
    setErrors((e) => ({
      ...e,
      categoryId: touched.current.category ? e.categoryId : undefined,
      unit: touched.current.unit ? e.unit : undefined,
    }));
  }, [form.name, item]);

  const duplicate = !item && form.name.trim()
    ? data.items.find((i) => i.name.toLowerCase() === form.name.trim().toLowerCase())
    : undefined;

  const unitLabelFor = (id: string) => data.units.find((u) => u.id === id)?.plural ?? id;

  const submit = (addAnother: boolean) => (e?: FormEvent) => {
    e?.preventDefault();
    const { errors: nextErrors, input } = validate(form);
    setErrors(nextErrors);
    if (!input) {
      // Make sure hidden optional fields with errors are visible.
      if (nextErrors.purchaseDate || nextErrors.notes || nextErrors.storageLocation) setShowMore(true);
      return;
    }
    if (item) {
      actions.updateItem(item.id, input);
      onDone();
      return;
    }
    const id = actions.addItem(input);
    onSaved?.(id);
    if (addAnother) {
      setForm(initialState(undefined, { categoryId: form.categoryId, storageLocation: form.storageLocation }));
      touched.current = { category: true, unit: false };
      setShowMore(false);
      nameRef.current?.focus();
    } else {
      onDone();
    }
  };

  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    setImageBusy(true);
    setImageError(undefined);
    try {
      set('image', await imageFileToDataUrl(file));
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'That image could not be used.');
    } finally {
      setImageBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const category = form.categoryId ? findCategory(data.categories, form.categoryId) : null;

  return (
    <form onSubmit={submit(false)} noValidate className="space-y-5 pb-2">
      <div>
        <TextField
          ref={nameRef}
          label="Item name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          placeholder="e.g. Rice, Tomato paste, Garri"
          autoComplete="off"
          autoCapitalize="sentences"
          maxLength={60}
          enterKeyHint="next"
        />
        {duplicate && (
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-soft px-3 py-2 text-sm text-amber-deep">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              You already have {duplicate.name} in your pantry.{' '}
              <Link to={`/pantry/${duplicate.id}`} className="font-bold underline" onClick={onDone}>
                Open it to add stock
              </Link>{' '}
              instead?
            </span>
          </p>
        )}
      </div>

      <CategoryPicker
        value={form.categoryId}
        error={errors.categoryId}
        onChange={(id) => {
          touched.current.category = true;
          set('categoryId', id);
        }}
      />

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <QuantityField label="Quantity" value={form.quantity} onChange={(v) => set('quantity', v)} error={errors.quantity} />
        <UnitPicker
          value={form.unit}
          error={errors.unit}
          onChange={(id) => {
            touched.current.unit = true;
            set('unit', id);
          }}
        />
      </div>

      <QuantityField
        label="Warn me when it gets down to"
        optional
        value={form.minimumStock}
        onChange={(v) => set('minimumStock', v)}
        error={errors.minimumStock}
        hint={
          form.minimumStock && form.unit
            ? `We'll mark it "Running low" at ${form.minimumStock} ${unitLabelFor(form.unit)} or less.`
            : 'Your minimum stock level. Leave empty if you don’t need a warning.'
        }
      />

      <DateField label="Expiry date" optional value={form.expiryDate} onChange={(v) => set('expiryDate', v)} error={errors.expiryDate} />

      <button
        type="button"
        onClick={() => setShowMore((s) => !s)}
        aria-expanded={showMore}
        className="flex min-h-12 w-full items-center justify-between rounded-xl border border-dashed border-line px-4 font-semibold text-olive-700 hover:bg-olive-50"
      >
        {showMore ? 'Fewer details' : 'More details — photo, where it’s kept, notes'}
        <ChevronDown aria-hidden className={`h-5 w-5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
      </button>

      {showMore && (
        <div className="space-y-5">
          <div>
            <p className="mb-1.5 text-[0.95rem] font-semibold text-charcoal">
              Photo <span className="text-sm font-medium text-stone-light">Optional</span>
            </p>
            <div className="flex items-center gap-4">
              {category ? (
                <CategoryArt category={category} image={form.image} size="md" alt={form.name ? `Photo of ${form.name}` : 'Item photo'} />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-cream" aria-hidden />
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" icon={Camera} onClick={() => fileRef.current?.click()} disabled={imageBusy}>
                  {imageBusy ? 'Processing…' : form.image ? 'Change photo' : 'Add photo'}
                </Button>
                {form.image && (
                  <Button variant="ghost" size="sm" icon={ImageOff} onClick={() => set('image', null)}>
                    Remove
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose item photo"
                onChange={(e) => onPickImage(e.target.files?.[0])}
              />
            </div>
            <p className={`mt-1.5 text-sm ${imageError ? 'font-semibold text-danger' : 'text-stone-warm'}`} role={imageError ? 'alert' : undefined}>
              {imageError ?? 'Without a photo, we show the category picture.'}
            </p>
          </div>

          <DateField
            label="Purchase date"
            optional
            value={form.purchaseDate}
            onChange={(v) => set('purchaseDate', v)}
            error={errors.purchaseDate}
            max={today()}
          />

          <div>
            <TextField
              label="Where is it kept?"
              optional
              value={form.storageLocation}
              onChange={(e) => set('storageLocation', e.target.value)}
              error={errors.storageLocation}
              placeholder="e.g. Pantry shelf"
              maxLength={60}
            />
            <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => set('storageLocation', loc)}
                  className={`chip ${form.storageLocation === loc ? 'chip-on' : 'chip-off'}`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <TextAreaField
            label="Notes"
            optional
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            error={errors.notes}
            placeholder="Brand, size, anything worth remembering"
            maxLength={500}
          />
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 flex flex-col gap-2 border-t border-line/70 bg-ivory px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:flex-row-reverse sm:px-6">
        <Button type="submit" size="lg" className="sm:flex-1">
          {item ? 'Save changes' : 'Add to pantry'}
        </Button>
        {!item && (
          <Button variant="secondary" size="lg" onClick={() => submit(true)()} className="sm:flex-1">
            Save & add another
          </Button>
        )}
      </div>
    </form>
  );
}
