import { useMemo, useState } from 'react';
import { ArrowUpDown, BellRing, Package, Plus, Search, SearchX, X } from 'lucide-react';
import { useStore } from '../state/store';
import { toItemViews, type ItemView } from '../state/selectors';
import { useSheets } from '../components/AppSheets';
import { ItemCard } from '../components/pantry/ItemCard';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { STOCK_ORDER } from '../lib/stock';
import { getCategoryIcon } from '../lib/icons';
import { pluralise } from '../lib/format';

type StatusFilter = 'all' | 'low' | 'out' | 'expiring';
type SortKey = 'name' | 'status' | 'expiry' | 'recent';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Running low' },
  { value: 'out', label: 'Out of stock' },
  { value: 'expiring', label: 'Expiring' },
];

const SORTERS: Record<SortKey, (a: ItemView, b: ItemView) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  status: (a, b) => STOCK_ORDER[a.stockStatus] - STOCK_ORDER[b.stockStatus] || a.name.localeCompare(b.name),
  expiry: (a, b) => {
    if (!a.expiryDate && !b.expiryDate) return a.name.localeCompare(b.name);
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return a.expiryDate.localeCompare(b.expiryDate);
  },
  recent: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
};

function initialStatus(query: URLSearchParams): StatusFilter {
  const s = query.get('status');
  return s === 'low' || s === 'out' || s === 'expiring' ? s : 'all';
}

export function PantryPage({ query }: { query: URLSearchParams }) {
  const { data } = useStore();
  const sheets = useSheets();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<StatusFilter>(() => initialStatus(query));
  const [sort, setSort] = useState<SortKey>('name');

  const views = useMemo(() => toItemViews(data), [data]);
  const usedCategories = useMemo(
    () => data.categories.filter((c) => views.some((v) => v.categoryId === c.id)),
    [data.categories, views],
  );
  const alertCount = views.filter((v) => v.stockStatus !== 'in' || v.expiryStatus === 'expired' || v.expiryStatus === 'week').length;

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return views
      .filter((v) => category === 'all' || v.categoryId === category)
      .filter((v) => {
        if (status === 'low') return v.stockStatus === 'low';
        if (status === 'out') return v.stockStatus === 'out';
        if (status === 'expiring') return v.expiryStatus === 'expired' || v.expiryStatus === 'week' || v.expiryStatus === 'month';
        return true;
      })
      .filter((v) => !q || v.name.toLowerCase().includes(q) || v.notes.toLowerCase().includes(q) || v.storageLocation.toLowerCase().includes(q))
      .sort(SORTERS[sort]);
  }, [views, category, status, search, sort]);

  const filtersActive = search.trim() !== '' || category !== 'all' || status !== 'all';
  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setStatus('all');
  };

  if (views.length === 0) {
    return (
      <>
        <PageHeader title="My Pantry" />
        <div className="card">
          <EmptyState
            icon={Package}
            title="Your pantry is empty"
            action={
              <Button size="lg" icon={Plus} onClick={() => sheets.openItemForm()}>
                Add your first item
              </Button>
            }
          >
            Add what you have at home, like rice, beans or vegetable oil. It only takes a few seconds per item.
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="My Pantry"
        subtitle={pluralise(views.length, 'item')}
        actions={
          <>
            {alertCount > 0 && (
              <ButtonLink to="/alerts" variant="secondary" icon={BellRing}>
                Alerts <span className="tabular rounded-full bg-terracotta px-2 py-0.5 text-xs font-bold text-white">{alertCount}</span>
              </ButtonLink>
            )}
            <Button icon={Plus} onClick={() => sheets.openItemForm()} className="hidden sm:inline-flex">
              Add item
            </Button>
          </>
        }
      />

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-light" aria-hidden />
          <input
            type="search"
            className="input pl-11 pr-11"
            placeholder="Search your pantry"
            aria-label="Search your pantry"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-stone-warm hover:bg-cream">
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by category">
          <button type="button" aria-pressed={category === 'all'} className={`chip ${category === 'all' ? 'chip-on' : 'chip-off'}`} onClick={() => setCategory('all')}>
            All categories
          </button>
          {usedCategories.map((c) => {
            const Icon = getCategoryIcon(c.icon);
            const on = category === c.id;
            return (
              <button key={c.id} type="button" aria-pressed={on} className={`chip ${on ? 'chip-on' : 'chip-off'}`} onClick={() => setCategory(on ? 'all' : c.id)}>
                <Icon className="h-4 w-4" aria-hidden />
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="no-scrollbar -mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter by stock">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={status === f.value}
                onClick={() => setStatus(f.value)}
                className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold transition-colors ${
                  status === f.value ? 'bg-charcoal text-ivory' : 'text-stone-warm hover:bg-cream'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="relative flex items-center">
            <span className="sr-only">Sort by</span>
            <ArrowUpDown className="pointer-events-none absolute left-3 h-4 w-4 text-stone-warm" aria-hidden />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="min-h-10 appearance-none rounded-full border border-line bg-white/80 py-1 pl-9 pr-4 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-olive-200"
            >
              <option value="name">A to Z</option>
              <option value="status">Stock status</option>
              <option value="expiry">Expiry date</option>
              <option value="recent">Recently updated</option>
            </select>
          </label>
        </div>
      </div>

      <p className="mt-5 text-sm text-stone-warm" aria-live="polite">
        {filtersActive ? `Showing ${results.length} of ${views.length}` : ''}
      </p>

      {results.length === 0 ? (
        <div className="card mt-2">
          <EmptyState
            compact
            icon={SearchX}
            title="No matching items"
            action={
              <Button variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          >
            {search ? `Nothing in your pantry matches “${search.trim()}”.` : 'No items match these filters.'}
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {/* Mobile add button, sitting just above the bottom navigation */}
      <button
        type="button"
        onClick={() => sheets.openItemForm()}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-14 items-center gap-2 rounded-2xl bg-olive-600 pl-4 pr-5 font-bold text-ivory shadow-lift hover:bg-olive-700 sm:hidden"
      >
        <Plus className="h-6 w-6" aria-hidden strokeWidth={2.4} />
        Add item
      </button>
    </>
  );
}
