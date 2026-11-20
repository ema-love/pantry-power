import { useState, type FormEvent } from 'react';
import { BellRing, ShoppingBasket } from 'lucide-react';
import type { MarketTrip } from '../../types';
import { useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { createId } from '../../lib/id';
import { addDays, today } from '../../lib/dates';
import { formatQty } from '../../lib/format';
import { notificationSupport, requestNotificationPermission, type NotificationSupport } from '../../lib/reminders';
import { validateName, validateOptionalDate } from '../../lib/validation';
import { Button, Link } from '../ui/Button';
import { RoundCheck, Switch } from '../ui/Checkbox';
import { DateField, TextAreaField, TextField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';

export function TripFormSheet({ open, onClose, trip }: { open: boolean; onClose: () => void; trip?: MarketTrip }) {
  return (
    <Sheet open={open} onClose={onClose} title={trip ? 'Edit market trip' : 'Plan a market trip'}>
      {open && <TripForm key={trip?.id ?? 'new'} trip={trip} onDone={onClose} />}
    </Sheet>
  );
}

function nextSaturday(): string {
  const d = new Date();
  const diff = (6 - d.getDay() + 7) % 7 || 7;
  return addDays(today(), diff);
}

export function permissionNote(state: NotificationSupport): string | null {
  if (state === 'unsupported') return 'This browser can’t show notifications, so the reminder will appear inside Pantry Power.';
  if (state === 'denied') return 'Notifications are blocked for this site, so the reminder will appear inside Pantry Power. You can allow them in your browser settings.';
  return null;
}

function TripForm({ trip, onDone }: { trip?: MarketTrip; onDone: () => void }) {
  const { data, dispatch } = useStore();
  const toast = useToast();
  const outstanding = data.shoppingList.filter((s) => !s.isCompleted || trip?.shoppingListItems.includes(s.id));

  const [title, setTitle] = useState(trip?.title ?? 'Market trip');
  const [date, setDate] = useState(trip?.plannedDate ?? nextSaturday());
  const [notes, setNotes] = useState(trip?.notes ?? '');
  const [reminder, setReminder] = useState(trip?.reminderEnabled ?? false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(trip ? trip.shoppingListItems : outstanding.map((s) => s.id)));
  const [permission, setPermission] = useState<NotificationSupport>(notificationSupport);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onReminderChange = async (on: boolean) => {
    setReminder(on);
    if (on && notificationSupport() === 'default') {
      setPermission(await requestNotificationPermission());
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = {
      title: validateName(title, 'Trip name'),
      date: !date ? 'Choose a date' : validateOptionalDate(date, { label: 'Date', notInPast: !trip || trip.plannedDate !== date }),
      notes: notes.length > 500 ? 'Notes must be 500 characters or fewer' : undefined,
    };
    setErrors(next);
    if (next.title || next.date || next.notes) return;
    const input = {
      title: title.trim(),
      plannedDate: date,
      reminderEnabled: reminder,
      notes: notes.trim(),
      shoppingListItems: outstanding.filter((s) => selected.has(s.id)).map((s) => s.id),
    };
    if (trip) {
      dispatch({ type: 'trip/update', id: trip.id, input });
      toast({ message: 'Trip updated' });
    } else {
      dispatch({ type: 'trip/add', id: createId('trip'), input, at: new Date().toISOString() });
      toast({ message: 'Market trip planned' });
    }
    if (reminder && !data.settings.remindersEnabled) {
      dispatch({ type: 'settings/update', patch: { remindersEnabled: true } });
    }
    onDone();
  };

  const note = reminder ? permissionNote(permission) : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-5 pb-2">
      <TextField label="Trip name" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={60} placeholder="e.g. Month-end restock" />
      <DateField label="When are you going?" value={date} onChange={setDate} error={errors.date} min={today()} />

      <fieldset>
        <legend className="mb-1.5 flex w-full items-baseline justify-between text-[0.95rem] font-semibold text-charcoal">
          Shopping list for this trip
          {outstanding.length > 0 && (
            <button
              type="button"
              className="text-sm font-bold text-olive-700"
              onClick={() => setSelected(selected.size === outstanding.length ? new Set() : new Set(outstanding.map((s) => s.id)))}
            >
              {selected.size === outstanding.length ? 'Select none' : 'Select all'}
            </button>
          )}
        </legend>
        {outstanding.length === 0 ? (
          <div className="flex items-start gap-3 rounded-2xl bg-cream/70 px-4 py-3 text-sm text-stone-warm">
            <ShoppingBasket className="mt-0.5 h-5 w-5 shrink-0 text-olive-600" aria-hidden />
            <p>
              Your shopping list is empty. You can still plan the trip, and{' '}
              <Link to="/shopping" className="font-bold text-olive-700 underline" onClick={onDone}>
                add items to the list
              </Link>{' '}
              later.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line/70 rounded-2xl border border-line bg-white/70">
            {outstanding.map((s) => (
              <li key={s.id} className="flex items-center gap-1 pr-4">
                <RoundCheck checked={selected.has(s.id)} onChange={() => toggle(s.id)} label={`Include ${s.name}`} />
                <button type="button" onClick={() => toggle(s.id)} className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 text-left">
                  <span className="truncate font-semibold">{s.name}</span>
                  <span className="tabular shrink-0 text-sm text-stone-warm">{formatQty(s.quantity, s.unit, data.units)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <TextAreaField label="Note" optional value={notes} onChange={(e) => setNotes(e.target.value)} error={errors.notes} placeholder="e.g. Go early. Bring the big bags." maxLength={500} />

      <div className="rounded-2xl border border-line bg-white/70 px-4 py-2">
        <Switch
          checked={reminder}
          onChange={onReminderChange}
          label="Remind me"
          description={data.settings.remindDayBefore ? 'The day before and on the day' : 'On the day'}
        />
        {note && (
          <p className="flex items-start gap-2 border-t border-line/70 py-2.5 text-sm text-stone-warm">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {note}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 border-t border-line/70 bg-ivory px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:px-6">
        <Button type="submit" size="lg" block>
          {trip ? 'Save trip' : 'Plan trip'}
        </Button>
      </div>
    </form>
  );
}
