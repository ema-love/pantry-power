import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { Category, CategoryTone } from '../../types';
import { useStore } from '../../state/store';
import { createId } from '../../lib/id';
import { CUSTOM_ICON_CHOICES, getCategoryIcon } from '../../lib/icons';
import { TONES } from '../../lib/categories';
import { Field, SelectField } from '../ui/Field';
import { Button } from '../ui/Button';

const NEW = '__new__';

export function CategoryPicker({ value, onChange, error }: { value: string; onChange: (id: string) => void; error?: string }) {
  const { data, dispatch } = useStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('box');
  const [nameError, setNameError] = useState<string>();

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return setNameError('Give the category a name');
    if (trimmed.length > 40) return setNameError('Keep it under 40 characters');
    const existing = data.categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      onChange(existing.id);
    } else {
      const tone: CategoryTone = TONES[data.categories.length % TONES.length];
      const category: Category = { id: createId('cat'), name: trimmed, icon, tone, isCustom: true };
      dispatch({ type: 'category/add', category });
      onChange(category.id);
    }
    setCreating(false);
    setName('');
    setNameError(undefined);
  };

  if (creating) {
    return (
      <div className="rounded-2xl border border-line bg-white/70 p-3.5">
        <Field label="New category name" error={nameError}>
          {({ id, invalid }) => (
            <input
              id={id}
              className="input"
              aria-invalid={invalid}
              value={name}
              autoFocus
              placeholder="e.g. Baby food"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  create();
                }
              }}
            />
          )}
        </Field>
        <p className="mb-2 mt-3 text-sm font-semibold text-charcoal">Pick an icon</p>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8" role="radiogroup" aria-label="Category icon">
          {CUSTOM_ICON_CHOICES.map((key) => {
            const Icon = getCategoryIcon(key);
            const selected = key === icon;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={key}
                onClick={() => setIcon(key)}
                className={`flex h-11 items-center justify-center rounded-xl border transition-colors ${selected ? 'border-olive-600 bg-olive-600 text-ivory' : 'border-line bg-white text-stone-warm hover:border-olive-300'}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setCreating(false)}>
            Cancel
          </Button>
          <Button size="sm" icon={Check} onClick={create}>
            Add category
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SelectField
      label="Category"
      error={error}
      value={value}
      onChange={(e) => {
        if (e.target.value === NEW) setCreating(true);
        else onChange(e.target.value);
      }}
    >
      {!value && <option value="">Choose a category</option>}
      {data.categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
      <option value={NEW}>+ Create a new category…</option>
    </SelectField>
  );
}

export function UnitPicker({ value, onChange, error, label = 'Unit' }: { value: string; onChange: (id: string) => void; error?: string; label?: string }) {
  const { data, dispatch } = useStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();

  const preferred = data.units.filter((u) => data.settings.preferredUnits.includes(u.id));
  const current = data.units.find((u) => u.id === value);
  const options = current && !preferred.includes(current) ? [current, ...preferred] : preferred;

  const create = () => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return setNameError('Type a unit, e.g. "bowl"');
    if (trimmed.length > 24) return setNameError('Keep it under 24 characters');
    const existing = data.units.find((u) => u.singular.toLowerCase() === trimmed || u.plural.toLowerCase() === trimmed);
    if (existing) {
      if (!data.settings.preferredUnits.includes(existing.id)) {
        dispatch({ type: 'settings/update', patch: { preferredUnits: [...data.settings.preferredUnits, existing.id] } });
      }
      onChange(existing.id);
    } else {
      const unit = { id: createId('unit'), singular: trimmed, plural: trimmed, isCustom: true };
      dispatch({ type: 'unit/add', unit });
      onChange(unit.id);
    }
    setCreating(false);
    setName('');
    setNameError(undefined);
  };

  if (creating) {
    return (
      <Field label={`New ${label.toLowerCase()}`} error={nameError}>
        {({ id, invalid }) => (
          <div className="flex gap-2">
            <input
              id={id}
              className="input min-w-0 flex-1"
              aria-invalid={invalid}
              value={name}
              autoFocus
              placeholder="e.g. bowl"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  create();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setCreating(false);
                }
              }}
            />
            <Button icon={Plus} onClick={create} aria-label="Add unit">
              Add
            </Button>
          </div>
        )}
      </Field>
    );
  }

  return (
    <SelectField
      label={label}
      error={error}
      value={value}
      onChange={(e) => {
        if (e.target.value === NEW) setCreating(true);
        else onChange(e.target.value);
      }}
    >
      {!value && <option value="">Choose</option>}
      {options.map((u) => (
        <option key={u.id} value={u.id}>
          {u.plural === u.singular ? u.singular : `${u.plural}`}
        </option>
      ))}
      <option value={NEW}>+ Other unit…</option>
    </SelectField>
  );
}

