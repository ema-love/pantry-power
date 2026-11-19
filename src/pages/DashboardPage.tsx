import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, CalendarDays, CalendarPlus, CircleDashed, FlaskConical, Package,
  Plus, ShoppingBasket, SlidersHorizontal, TriangleAlert, type LucideIcon,
} from 'lucide-react';
import { useStore } from '../state/store';
import { expiryGroups, lowStockItems, toItemViews, tripItems, upcomingTrips } from '../state/selectors';
import { useSheets } from '../components/AppSheets';
import { Section } from '../components/layout/PageHeader';
import { LogoMark } from '../components/layout/Logo';
import { ReminderBanners } from '../components/market/ReminderBanners';
import { AttentionRow } from '../components/pantry/AttentionRow';
import { DemoBanner } from '../components/DemoBanner';
import { Button, ButtonLink, Link } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { formatDate, formatLongToday, formatTimestamp, greeting, relativeDay } from '../lib/dates';
import { formatQty } from '../lib/format';
import { expiryText } from '../lib/stock';

export function DashboardPage() {
  const { data } = useStore();
  const sheets = useSheets();
  const views = useMemo(() => toItemViews(data), [data]);
  const { out, low } = lowStockItems(views);
  const expiry = expiryGroups(views);
  const soon = [...expiry.expired, ...expiry.week];
  const nextTrip = upcomingTrips(data)[0];
  const toBuy = data.shoppingList.filter((s) => !s.isCompleted).length;
  const recent = useMemo(
    () => [...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [data.transactions],
  );
  const household = data.settings.householdName.trim();
  const isEmpty = views.length === 0;

  return (
    <>
      <header className="mb-6 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 lg:hidden">
            <LogoMark className="h-9 w-9" />
          </div>
          <h1 className="text-[1.75rem] font-extrabold leading-tight text-charcoal sm:text-3xl">{greeting()}</h1>
          <p className="mt-1 text-[0.95rem] text-stone-warm">
            {household ? <span className="font-semibold text-charcoal">{household} · </span> : null}
            {formatLongToday()}
          </p>
        </div>
        {!isEmpty && (
          <Button icon={Plus} onClick={() => sheets.openItemForm()} className="hidden sm:inline-flex">
            Add item
          </Button>
        )}
      </header>

      <DemoBanner />
      {isEmpty ? <Welcome /> : null}
      <ReminderBanners linkToMarket />

      {!isEmpty && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard to="/pantry" icon={Package} label="Items in pantry" value={views.length} tone="olive" />
            <StatCard to="/alerts?tab=stock" icon={TriangleAlert} label="Running low" value={low.length} tone="amber" />
            <StatCard to="/alerts?tab=stock" icon={CircleDashed} label="Out of stock" value={out.length} tone="danger" />
            <StatCard to="/alerts?tab=expiry" icon={CalendarClock} label="Expiring soon" value={soon.length} tone="terracotta" hint="Expired or within 7 days" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Button size="lg" icon={Plus} onClick={() => sheets.openItemForm()}>
              Add item
            </Button>
            <ButtonLink to="/shopping" size="lg" variant="secondary" icon={ShoppingBasket}>
              <span className="sm:hidden">Shopping</span>
              <span className="hidden sm:inline">Shopping list</span>
              {toBuy > 0 && <span className="tabular rounded-full bg-terracotta px-2 py-0.5 text-xs font-bold text-white">{toBuy}</span>}
            </ButtonLink>
            <Button size="lg" variant="secondary" icon={CalendarPlus} onClick={() => sheets.openTripForm()} className="col-span-2 sm:col-span-1">
              Plan market trip
            </Button>
          </div>
        </>
      )}

      {!isEmpty && (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-8">
            <Section
              title="Running out"
              action={
                out.length + low.length > 0 ? (
                  <Link to="/alerts?tab=stock" className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-olive-700">
                    See all <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : undefined
              }
            >
              {out.length + low.length === 0 ? (
                <p className="card px-5 py-5 text-stone-warm">Nothing is running low. Nice work.</p>
              ) : (
                <ul className="card divide-y divide-line/70">
                  {[...out, ...low].slice(0, 4).map((item) => (
                    <AttentionRow
                      key={item.id}
                      item={item}
                      detail={item.stockStatus === 'out' ? 'Out of stock' : `${formatQty(item.quantity, item.unit, data.units)} left`}
                      actions={
                        item.onShoppingList ? (
                          <span className="px-2 text-sm font-semibold text-olive-700">On list</span>
                        ) : (
                          <Button size="sm" variant="secondary" icon={ShoppingBasket} onClick={() => sheets.openShoppingForm({ fromItemId: item.id })}>
                            Add to list
                          </Button>
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </Section>

            {soon.length > 0 && (
              <Section
                title="Expiring soon"
                action={
                  <Link to="/alerts?tab=expiry" className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-olive-700">
                    See all <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                }
              >
                <ul className="card divide-y divide-line/70">
                  {soon.slice(0, 3).map((item) => (
                    <AttentionRow key={item.id} item={item} detail={<span className={item.expiryStatus === 'expired' ? 'font-semibold text-danger' : 'font-semibold text-amber-deep'}>{expiryText(item.expiryDate!)}</span>} />
                  ))}
                </ul>
              </Section>
            )}
          </div>

          <div className="space-y-8">
            <Section title="Next market trip">
              {nextTrip ? (
                <Link to="/market" className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-lift">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-olive-600 text-ivory">
                    <CalendarDays className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-charcoal">{nextTrip.title}</span>
                    <span className="block text-sm text-stone-warm">
                      {formatDate(nextTrip.plannedDate, { withWeekday: true })} · {relativeDay(nextTrip.plannedDate)}
                    </span>
                    <span className="block text-sm text-stone-warm">
                      {(() => {
                        const items = tripItems(data, nextTrip.shoppingListItems);
                        return items.length ? `${items.filter((s) => !s.isCompleted).length} items to buy` : 'No list attached';
                      })()}
                    </span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-stone-light" aria-hidden />
                </Link>
              ) : (
                <div className="card flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
                  <p className="flex-1 text-stone-warm">No trip planned yet.</p>
                  <Button size="sm" variant="secondary" icon={CalendarPlus} onClick={() => sheets.openTripForm()}>
                    Plan a trip
                  </Button>
                </div>
              )}
            </Section>

            <Section title="Recent activity">
              {recent.length === 0 ? (
                <p className="card px-5 py-5 text-stone-warm">Stock changes will show up here.</p>
              ) : (
                <ol className="card divide-y divide-line/70">
                  {recent.map((t) => {
                    const meta = ACTIVITY[t.transactionType];
                    const exists = data.items.some((i) => i.id === t.itemId);
                    const body = (
                      <>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
                          <meta.icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-charcoal">
                            {meta.verb} {formatQty(t.quantity, t.unit, data.units)} {t.transactionType === 'adjustment' ? 'on' : 'of'} {t.itemName}
                          </span>
                          <span className="block text-sm text-stone-warm">{formatTimestamp(t.date)}</span>
                        </span>
                      </>
                    );
                    return (
                      <li key={t.id}>
                        {exists ? (
                          <Link to={`/pantry/${t.itemId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-cream/40">
                            {body}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </Section>
          </div>
        </div>
      )}
    </>
  );
}

const ACTIVITY: Record<string, { verb: string; icon: LucideIcon; tone: string }> = {
  addition: { verb: 'Added', icon: ArrowUpRight, tone: 'bg-olive-100 text-olive-700' },
  consumption: { verb: 'Used', icon: ArrowDownRight, tone: 'bg-terracotta-50 text-terracotta-600' },
  adjustment: { verb: 'Corrected', icon: SlidersHorizontal, tone: 'bg-cream text-stone-warm' },
};

const STAT_TONES = {
  olive: 'bg-olive-100 text-olive-700',
  amber: 'bg-amber-soft text-amber-deep',
  danger: 'bg-danger-soft text-danger-deep',
  terracotta: 'bg-terracotta-50 text-terracotta-600',
};

function StatCard({ to, icon: Icon, label, value, tone, hint }: { to: string; icon: LucideIcon; label: string; value: number; tone: keyof typeof STAT_TONES; hint?: string }) {
  return (
    <Link to={to} className="card group flex flex-col gap-3 p-4 transition-shadow hover:shadow-lift" aria-label={`${label}: ${value}${hint ? ` (${hint})` : ''}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${STAT_TONES[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span>
        <span className="tabular block text-3xl font-extrabold leading-none text-charcoal">{value}</span>
        <span className="mt-1.5 block text-sm font-semibold text-stone-warm">{label}</span>
      </span>
    </Link>
  );
}

function Welcome() {
  const { data, dispatch } = useStore();
  const sheets = useSheets();
  const toast = useToast();
  const [name, setName] = useState(data.settings.householdName);

  const saveName = (e?: FormEvent) => {
    e?.preventDefault();
    if (name.trim() === data.settings.householdName) return;
    dispatch({ type: 'settings/update', patch: { householdName: name.trim().slice(0, 60) } });
    if (name.trim()) toast({ message: 'Household name saved' });
  };

  return (
    <section className="card mb-6 overflow-hidden" aria-label="Welcome">
      <div className="bg-olive-600 px-5 py-6 text-ivory sm:px-7 sm:py-8">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-sage">Welcome to Pantry Power</p>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">Your pantry. Your stock. Always in control.</h2>
        <p className="mt-2 max-w-xl text-ivory/80">
          Keep track of what you have at home, see what's running out, and plan your next market trip — all in one place.
        </p>
      </div>
      <div className="space-y-5 p-5 sm:p-7">
        <form onSubmit={saveName} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1.5 block font-semibold text-charcoal">What should we call your household? <span className="text-sm font-medium text-stone-light">Optional</span></span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => saveName()} placeholder="e.g. The Adeyemi Home" maxLength={60} />
          </label>
        </form>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="lg" icon={Plus} onClick={() => sheets.openItemForm()}>
            Add my first item
          </Button>
          <Button size="lg" variant="secondary" icon={FlaskConical} onClick={() => dispatch({ type: 'demo/load' })}>
            Explore with demo items
          </Button>
        </div>
        <p className="text-sm text-stone-warm">Demo items are clearly labelled and can be removed in one tap whenever you're ready.</p>
      </div>
    </section>
  );
}
