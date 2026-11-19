import { useState } from 'react';
import { Bell, BellOff, CalendarDays, CalendarPlus, CheckCircle2, ChevronDown, Pencil, RotateCcw, ShoppingBasket, StickyNote, Trash2 } from 'lucide-react';
import type { MarketTrip } from '../types';
import { useStore } from '../state/store';
import { useActions } from '../state/useActions';
import { restockableEntries, tripItems, upcomingTrips } from '../state/selectors';
import { useSheets } from '../components/AppSheets';
import { PageHeader, Section } from '../components/layout/PageHeader';
import { ReminderBanners } from '../components/market/ReminderBanners';
import { Button, IconButton } from '../components/ui/Button';
import { RoundCheck } from '../components/ui/Checkbox';
import { DemoBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { formatDate, formatTimestamp, parseDateOnly, relativeDay } from '../lib/dates';
import { formatQty } from '../lib/format';

export function MarketPage() {
  const { data } = useStore();
  const sheets = useSheets();
  const [showHistory, setShowHistory] = useState(false);
  const upcoming = upcomingTrips(data);
  const completed = data.trips
    .filter((t) => t.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  return (
    <>
      <PageHeader
        title="Market planner"
        subtitle="Plan your next shopping trip and take the list along."
        actions={
          <Button icon={CalendarPlus} onClick={() => sheets.openTripForm()}>
            Plan a trip
          </Button>
        }
      />

      <ReminderBanners />

      <Section title="Upcoming trips">
        {upcoming.length === 0 ? (
          <div className="card">
            <EmptyState
              compact
              icon={CalendarDays}
              title="No trips planned"
              action={
                <Button icon={CalendarPlus} onClick={() => sheets.openTripForm()}>
                  Plan a trip
                </Button>
              }
            >
              Pick a day, attach your shopping list and get a reminder before you go.
            </EmptyState>
          </div>
        ) : (
          <ul className="space-y-4">
            {upcoming.map((trip, i) => (
              <li key={trip.id}>
                <TripCard trip={trip} defaultOpen={i === 0} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {completed.length > 0 && (
        <section className="mt-8" aria-label="Completed trips">
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            aria-expanded={showHistory}
            className="flex min-h-11 w-full items-center justify-between rounded-xl text-left"
          >
            <span className="section-title">Completed trips ({completed.length})</span>
            <ChevronDown className={`h-5 w-5 text-stone-warm transition-transform ${showHistory ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {showHistory && (
            <ul className="mt-3 space-y-3">
              {completed.map((trip) => (
                <li key={trip.id}>
                  <CompletedTripCard trip={trip} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

function DateTile({ date, muted }: { date: string; muted?: boolean }) {
  const d = parseDateOnly(date);
  if (!d) return null;
  return (
    <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl ${muted ? 'bg-cream text-stone-warm' : 'bg-olive-600 text-ivory'}`} aria-hidden>
      <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-80">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
      <span className="text-2xl font-extrabold leading-none">{d.getDate()}</span>
    </div>
  );
}

function TripCard({ trip, defaultOpen }: { trip: MarketTrip & { daysAway: number }; defaultOpen: boolean }) {
  const { data, dispatch } = useStore();
  const actions = useActions();
  const sheets = useSheets();
  const confirm = useConfirm();
  const toast = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const items = tripItems(data, trip.shoppingListItems);
  const boughtCount = items.filter((s) => s.isCompleted).length;
  const overdue = trip.daysAway < 0;

  const complete = async () => {
    const restockable = restockableEntries(data, trip.shoppingListItems);
    const left = items.length - boughtCount;
    const ok = await confirm({
      title: 'Mark trip as done?',
      message: (
        <>
          {left > 0 && <p>{left} item{left === 1 ? ' is' : 's are'} not ticked. {left === 1 ? 'It' : 'They'} will stay on your shopping list.</p>}
          {restockable.length > 0 && (
            <p className={left > 0 ? 'mt-2' : ''}>
              We'll also add {restockable.length} bought item{restockable.length === 1 ? '' : 's'} to your pantry stock.
            </p>
          )}
          {left === 0 && restockable.length === 0 && <p>Well done. This trip will move to your completed trips.</p>}
        </>
      ),
      confirmLabel: 'Mark as done',
    });
    if (!ok) return;
    if (restockable.length) actions.restockFromShopping(trip.shoppingListItems);
    dispatch({ type: 'trip/complete', id: trip.id, at: new Date().toISOString() });
    toast({ message: `${trip.title} completed`, action: { label: 'Undo', onClick: () => dispatch({ type: 'trip/reopen', id: trip.id }) } });
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${trip.title}?`,
      message: 'The trip will be deleted. Your shopping list items stay on the list.',
      confirmLabel: 'Delete trip',
      danger: true,
    });
    if (ok) {
      dispatch({ type: 'trip/delete', id: trip.id });
      toast({ message: 'Trip deleted' });
    }
  };

  const toggleReminder = () => {
    dispatch({
      type: 'trip/update',
      id: trip.id,
      input: { title: trip.title, plannedDate: trip.plannedDate, notes: trip.notes, shoppingListItems: trip.shoppingListItems, reminderEnabled: !trip.reminderEnabled },
    });
    toast({ message: trip.reminderEnabled ? 'Reminder turned off' : 'Reminder turned on' });
  };

  return (
    <article className="card overflow-hidden">
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <DateTile date={trip.plannedDate} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-lg font-bold leading-snug text-charcoal">{trip.title}</h3>
            {trip.isDemo && <DemoBadge />}
          </div>
          <p className={`text-[0.95rem] ${overdue ? 'font-semibold text-terracotta-600' : 'text-stone-warm'}`}>
            {formatDate(trip.plannedDate, { withWeekday: true })} · {overdue ? `planned ${relativeDay(trip.plannedDate)}` : relativeDay(trip.plannedDate)}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-warm">
            <span className="inline-flex items-center gap-1">
              <ShoppingBasket className="h-4 w-4" aria-hidden />
              {items.length === 0 ? 'No list attached' : `${boughtCount} of ${items.length} bought`}
            </span>
            <span className="inline-flex items-center gap-1">
              {trip.reminderEnabled ? <Bell className="h-4 w-4" aria-hidden /> : <BellOff className="h-4 w-4" aria-hidden />}
              {trip.reminderEnabled ? 'Reminder on' : 'No reminder'}
            </span>
          </p>
        </div>
      </div>

      {trip.notes && (
        <p className="mx-4 mb-3 flex gap-2 rounded-xl bg-cream/70 px-3 py-2 text-sm text-charcoal sm:mx-5">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-stone-warm" aria-hidden />
          <span className="whitespace-pre-wrap">{trip.notes}</span>
        </p>
      )}

      {items.length > 0 && (
        <div className="border-t border-line/70">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex min-h-12 w-full items-center justify-between px-4 text-left font-semibold text-olive-700 hover:bg-olive-50 sm:px-5"
          >
            {open ? 'Hide shopping list' : 'Show shopping list'}
            <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {open && (
            <ul className="divide-y divide-line/60 border-t border-line/70 bg-ivory/60">
              {items.map((s) => (
                <li key={s.id} className="flex items-center gap-1 pr-4 sm:pr-5">
                  <RoundCheck checked={s.isCompleted} onChange={() => actions.toggleShoppingEntry(s)} label={`${s.isCompleted ? 'Unmark' : 'Mark'} ${s.name} as bought`} />
                  <span className={`min-w-0 flex-1 truncate font-semibold ${s.isCompleted ? 'text-stone-light line-through' : 'text-charcoal'}`}>{s.name}</span>
                  <span className={`tabular shrink-0 text-sm font-semibold ${s.isCompleted ? 'text-stone-light line-through' : 'text-stone-warm'}`}>
                    {formatQty(s.quantity, s.unit, data.units)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line/70 p-3 sm:px-5">
        <Button icon={CheckCircle2} onClick={complete} className="flex-1 sm:flex-none">
          Mark as done
        </Button>
        <div className="ml-auto flex gap-1">
          <IconButton icon={trip.reminderEnabled ? BellOff : Bell} label={trip.reminderEnabled ? 'Turn reminder off' : 'Turn reminder on'} onClick={toggleReminder} />
          <IconButton icon={Pencil} label="Edit trip" onClick={() => sheets.openTripForm(trip.id)} />
          <IconButton icon={Trash2} label="Delete trip" onClick={remove} className="hover:text-danger" />
        </div>
      </div>
    </article>
  );
}

function CompletedTripCard({ trip }: { trip: MarketTrip }) {
  const { data, dispatch } = useStore();
  const confirm = useConfirm();
  const snapshot = trip.itemsSnapshot ?? [];
  const bought = snapshot.filter((s) => s.isCompleted).length;
  return (
    <article className="card flex flex-wrap items-center gap-3 p-4">
      <DateTile date={trip.plannedDate} muted />
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-charcoal">{trip.title}</h3>
        <p className="text-sm text-stone-warm">
          Done {trip.completedAt ? formatTimestamp(trip.completedAt) : ''}
          {snapshot.length > 0 && ` · ${bought} of ${snapshot.length} bought`}
        </p>
        {snapshot.length > 0 && (
          <p className="mt-1 line-clamp-2 text-sm text-stone-light">
            {snapshot.map((s) => `${s.name} (${formatQty(s.quantity, s.unit, data.units)})`).join(', ')}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        <IconButton icon={RotateCcw} label="Move back to upcoming" onClick={() => dispatch({ type: 'trip/reopen', id: trip.id })} />
        <IconButton
          icon={Trash2}
          label="Delete trip"
          className="hover:text-danger"
          onClick={async () => {
            if (await confirm({ title: 'Delete this trip?', message: 'It will be removed from your history.', confirmLabel: 'Delete', danger: true })) {
              dispatch({ type: 'trip/delete', id: trip.id });
            }
          }}
        />
      </div>
    </article>
  );
}

