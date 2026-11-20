import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { PantryItem } from '../../types';
import { useStore } from '../../state/store';
import { useActions } from '../../state/useActions';
import { useToast } from '../ui/Toast';
import { validateOptionalDate } from '../../lib/validation';
import { expiryText } from '../../lib/stock';
import { Button } from '../ui/Button';
import { DateField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';

export function ExpirySheet({ open, onClose, item }: { open: boolean; onClose: () => void; item?: PantryItem }) {
  return (
    <Sheet open={open} onClose={onClose} title={item ? `${item.name} expiry` : 'Expiry date'} description={item?.expiryDate ? expiryText(item.expiryDate) : undefined}>
      {open && item && <ExpiryForm key={item.id} item={item} onDone={onClose} />}
    </Sheet>
  );
}

function ExpiryForm({ item, onDone }: { item: PantryItem; onDone: () => void }) {
  const { dispatch } = useStore();
  const actions = useActions();
  const toast = useToast();
  const [date, setDate] = useState(item.expiryDate ?? '');
  const [error, setError] = useState<string>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateOptionalDate(date, { label: 'Expiry date' });
    if (err) return setError(err);
    dispatch({ type: 'item/setExpiry', id: item.id, expiryDate: date || null, at: new Date().toISOString() });
    toast({ message: date ? 'Expiry date updated' : 'Expiry date removed' });
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5 pb-2">
      <DateField
        label="New expiry date"
        optional
        value={date}
        onChange={(v) => {
          setDate(v);
          setError(undefined);
        }}
        error={error}
        hint="Bought a fresh batch? Set the date on the new pack."
      />
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" size="lg" className="sm:flex-1">
          Save date
        </Button>
        <Button
          variant="secondary"
          size="lg"
          icon={Trash2}
          className="text-danger sm:flex-1"
          onClick={async () => {
            if (await actions.deleteItem(item, { reason: 'discard' })) onDone();
          }}
        >
          I threw it away
        </Button>
      </div>
    </form>
  );
}
