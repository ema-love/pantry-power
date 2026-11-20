import { useMemo } from 'react';
import { CalendarDays, Link2, PackagePlus, Plus, ShoppingBasket, Sparkles, X } from 'lucide-react';
import type { ShoppingListItem } from '../types';
import { useStore } from '../state/store';
import { useActions } from '../state/useActions';
import { groupByCategory, lowStockItems, restockableEntries, toItemViews, upcomingTrips } from '../state/selectors';
import { useSheets } from '../components/AppSheets';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Link } from '../components/ui/Button';
import { RoundCheck } from '../components/ui/Checkbox';
import { DemoBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { findCategory } from '../lib/categories';
import { getCategoryIcon } from '../lib/icons';
import { formatQty } from '../lib/format';
import { formatDate } from '../lib/dates';

export function ShoppingPage() {
  const { data } = useStore();
  const actions = useActions();
  const sheets = useSheets();

  const outstanding = data.shoppingList.filter((s) => !s.isCompleted);
  const bought = data.shoppingList
    .filter((s) => s.isCompleted)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const total = data.shoppingList.length;
  const categoryOrder = data.categories.map((c) => c.id);
  const groups = groupByCategory([...outstanding].sort((a, b) => a.name.localeCompare(b.name)), categoryOrder);

  const views = useMemo(() => toItemViews(data), [data]);
  const { out, low } = lowStockItems(views);
  const suggestions = [...out, ...low].filter((i) => !i.onShoppingList);
  const restockable = restockableEntries(data);
  const nextTrip = upcomingTrips(data)[0];

  if (total === 0) {
    return (
      <>
        <PageHeader title="Shopping list" />
        {suggestions.length > 0 && <SuggestionBanner count={suggestions.length} onAdd={() => actions.addManyToList(suggestions)} />}
        <div className="card">
          <EmptyState
            icon={ShoppingBasket}
            title="Your shopping list is empty"
            action={
              <Button size="lg" icon={Plus} onClick={() => sheets.openShoppingForm()}>
                Add an item
              </Button>
            }
          >
            Add things you need to buy. Items that run low in your pantry can be added with one tap.
          </EmptyState>
        </div>
      </>
    );
  }

  const progress = total ? Math.round((bought.length / total) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Shopping list"
        subtitle={outstanding.length === 0 ? 'Everything is bought' : `${outstanding.length} item${outstanding.length === 1 ? '' : 's'} left to buy`}
        actions={
          <Button icon={Plus} onClick={() => sheets.openShoppingForm()}>
            Add item
          </Button>
        }
      />

      <div className="card mb-5 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="shrink-0 whitespace-nowrap font-semibold text-charcoal">
            <span className="tabular">{bought.length}</span> of <span className="tabular">{total}</span> bought
          </p>
          {nextTrip && (
            <Link to="/market" className="inline-flex min-h-10 min-w-0 items-center gap-1.5 text-right text-sm font-semibold text-olive-700">
              <CalendarDays className="h-4 w-4" aria-hidden />
              {nextTrip.title} · {formatDate(nextTrip.plannedDate)}
            </Link>
          )}
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cream" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Shopping progress">
          <div className="h-full rounded-full bg-olive-500 transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {suggestions.length > 0 && <SuggestionBanner count={suggestions.length} onAdd={() => actions.addManyToList(suggestions)} />}

      {restockable.length > 0 && (
        <div className="mb-5 flex flex-col items-start gap-3 rounded-2xl bg-olive-50 p-4 ring-1 ring-olive-100 sm:flex-row sm:items-center">
          <PackagePlus className="hidden h-6 w-6 shrink-0 text-olive-600 sm:block" aria-hidden />
          <p className="flex-1 text-charcoal">
            You bought <strong>{restockable.length}</strong> item{restockable.length === 1 ? '' : 's'} from your pantry. Add {restockable.length === 1 ? 'it' : 'them'} to your stock?
          </p>
          <Button icon={PackagePlus} onClick={() => actions.restockFromShopping()}>
            Update pantry
          </Button>
        </div>
      )}

      {outstanding.length === 0 ? (
        <div className="card mb-6 px-5 py-8 text-center">
          <p className="text-lg font-bold text-charcoal">All done!</p>
          <p className="mt-1 text-stone-warm">Everything on your list has been bought.</p>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">
          {groups.map((g) => {
            const category = findCategory(data.categories, g.categoryId);
            const Icon = getCategoryIcon(category.icon);
            return (
              <section key={g.categoryId} aria-label={category.name}>
                <h2 className="mb-2 flex items-center gap-2 font-bold text-charcoal">
                  <Icon className="h-[1.1rem] w-[1.1rem] text-olive-600" aria-hidden />
                  {category.name}
                  <span className="tabular text-sm font-semibold text-stone-light">{g.items.length}</span>
                </h2>
                <ul className="card divide-y divide-line/70">
                  {g.items.map((entry) => (
                    <ShoppingRow key={entry.id} entry={entry} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {bought.length > 0 && (
        <section aria-label="Bought">
          <div className="mb-2 flex min-h-10 items-center justify-between gap-3">
            <h2 className="section-title">In the basket ({bought.length})</h2>
            <Button size="sm" variant="ghost" onClick={() => actions.clearCompleted(bought.length)}>
              Clear bought items
            </Button>
          </div>
          <ul className="card divide-y divide-line/70 bg-cream/40">
            {bought.map((entry) => (
              <ShoppingRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function SuggestionBanner({ count, onAdd }: { count: number; onAdd: () => void }) {
  return (
    <div className="mb-5 flex flex-col items-start gap-3 rounded-2xl bg-terracotta-50 p-4 sm:flex-row sm:items-center">
      <Sparkles className="hidden h-6 w-6 shrink-0 text-terracotta-600 sm:block" aria-hidden />
      <p className="flex-1 text-charcoal">
        <strong>{count}</strong> pantry item{count === 1 ? ' is' : 's are'} running low or out of stock.
      </p>
      <Button variant="accent" icon={Plus} onClick={onAdd}>
        Add {count === 1 ? 'it' : 'them'} to list
      </Button>
    </div>
  );
}

function ShoppingRow({ entry }: { entry: ShoppingListItem }) {
  const { data } = useStore();
  const actions = useActions();
  const sheets = useSheets();
  const done = entry.isCompleted;
  return (
    <li className="flex items-center gap-1 pr-1.5">
      <RoundCheck checked={done} onChange={() => actions.toggleShoppingEntry(entry)} label={`${done ? 'Unmark' : 'Mark'} ${entry.name} as bought`} />
      <button
        type="button"
        onClick={() => sheets.openShoppingForm({ entryId: entry.id })}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left"
        aria-label={`Edit ${entry.name}`}
      >
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-1.5 font-semibold ${done ? 'text-stone-light line-through' : 'text-charcoal'}`}>
            <span className="truncate">{entry.name}</span>
            {entry.linkedPantryItemId && <Link2 className="h-3.5 w-3.5 shrink-0 text-olive-500" aria-label="Linked to pantry item" />}
            {entry.isDemo && <DemoBadge />}
          </span>
          {(entry.notes || (done && entry.restockedAt)) && (
            <span className="block truncate text-sm text-stone-warm">
              {done && entry.restockedAt ? 'Added to pantry' : entry.notes}
            </span>
          )}
        </span>
        <span className={`tabular shrink-0 text-[0.95rem] font-bold ${done ? 'text-stone-light line-through' : 'text-charcoal'}`}>
          {formatQty(entry.quantity, entry.unit, data.units)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => actions.removeShoppingEntry(entry)}
        aria-label={`Remove ${entry.name} from list`}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-light hover:bg-cream hover:text-danger"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </li>
  );
}

