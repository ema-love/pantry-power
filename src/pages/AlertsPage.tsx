import { useMemo, useState, type ReactNode } from 'react';
import { CalendarCheck, Check, CircleCheckBig, ShoppingBasket } from 'lucide-react';
import { useStore } from '../state/store';
import { useActions } from '../state/useActions';
import { expiryGroups, lowStockItems, toItemViews, type ItemView } from '../state/selectors';
import { useSheets } from '../components/AppSheets';
import { PageHeader } from '../components/layout/PageHeader';
import { AttentionRow } from '../components/pantry/AttentionRow';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Segmented } from '../components/ui/Segmented';
import { formatQty } from '../lib/format';
import { formatDate } from '../lib/dates';
import { expiryText } from '../lib/stock';
import { navigate } from '../lib/router';

type Tab = 'stock' | 'expiry';

export function AlertsPage({ query }: { query: URLSearchParams }) {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>(query.get('tab') === 'expiry' ? 'expiry' : 'stock');
  const views = useMemo(() => toItemViews(data), [data]);
  const stock = lowStockItems(views);
  const expiry = expiryGroups(views);
  const stockCount = stock.out.length + stock.low.length;
  const expiryCount = expiry.expired.length + expiry.week.length + expiry.month.length;

  const changeTab = (t: Tab) => {
    setTab(t);
    navigate(`/alerts?tab=${t}`, { replace: true });
  };

  return (
    <>
      <PageHeader back="/pantry" title="Needs attention" subtitle="Items running out and items close to expiry." />
      <Segmented
        label="Alert type"
        value={tab}
        onChange={changeTab}
        options={[
          { value: 'stock', label: 'Running out', count: stockCount },
          { value: 'expiry', label: 'Expiry', count: expiryCount },
        ]}
      />
      <div className="mt-5">{tab === 'stock' ? <StockAlerts out={stock.out} low={stock.low} /> : <ExpiryAlerts {...expiry} />}</div>
    </>
  );
}

function AlertGroup({ title, tone, count, children, action }: { title: string; tone: 'danger' | 'amber' | 'muted'; count: number; children: ReactNode; action?: ReactNode }) {
  if (count === 0) return null;
  const dot = tone === 'danger' ? 'bg-danger' : tone === 'amber' ? 'bg-amber' : 'bg-stone-light';
  return (
    <section className="mb-6" aria-label={title}>
      <div className="mb-2.5 flex min-h-10 items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
        <h2 className="flex-1 font-bold text-charcoal">
          {title} <span className="tabular font-semibold text-stone-warm">({count})</span>
        </h2>
        {action}
      </div>
      <ul className="card divide-y divide-line/70">{children}</ul>
    </section>
  );
}

function ListButton({ item }: { item: ItemView }) {
  const sheets = useSheets();
  if (item.onShoppingList) {
    return (
      <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-olive-700">
        <Check className="h-4 w-4" aria-hidden /> On list
      </span>
    );
  }
  return (
    <Button size="sm" variant="secondary" icon={ShoppingBasket} onClick={() => sheets.openShoppingForm({ fromItemId: item.id })}>
      Add to list
    </Button>
  );
}

function StockAlerts({ out, low }: { out: ItemView[]; low: ItemView[] }) {
  const { data } = useStore();
  const actions = useActions();
  const notOnList = [...out, ...low].filter((i) => !i.onShoppingList);

  if (out.length + low.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={CircleCheckBig} title="Nothing is running low">
          Everything is above its minimum level. Set a "Warn me when it gets down to" amount on items to get alerts here.
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      {notOnList.length > 0 && (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-2xl bg-terracotta-50 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-charcoal">
            <strong>{notOnList.length}</strong> item{notOnList.length === 1 ? ' is' : 's are'} not on your shopping list yet.
          </p>
          <Button variant="accent" icon={ShoppingBasket} onClick={() => actions.addManyToList(notOnList)}>
            Add all to list
          </Button>
        </div>
      )}
      <AlertGroup title="Out of stock" tone="danger" count={out.length}>
        {out.map((item) => (
          <AttentionRow key={item.id} item={item} detail="None left" actions={<ListButton item={item} />} />
        ))}
      </AlertGroup>
      <AlertGroup title="Running low" tone="amber" count={low.length}>
        {low.map((item) => (
          <AttentionRow
            key={item.id}
            item={item}
            detail={`${formatQty(item.quantity, item.unit, data.units)} left · warn at ${formatQty(item.minimumStock, item.unit, data.units)}`}
            actions={<ListButton item={item} />}
          />
        ))}
      </AlertGroup>
    </>
  );
}

function ExpiryAlerts({ expired, week, month }: { expired: ItemView[]; week: ItemView[]; month: ItemView[] }) {
  const sheets = useSheets();
  const actions = useActions();

  if (expired.length + week.length + month.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={CalendarCheck} title="Nothing expiring soon">
          No items expire in the next 30 days. Items without an expiry date are never shown as expired.
        </EmptyState>
      </div>
    );
  }

  const row = (item: ItemView, discard: boolean) => (
    <AttentionRow
      key={item.id}
      item={item}
      stackActions={discard}
      detail={`${expiryText(item.expiryDate!)} · ${formatDate(item.expiryDate)}`}
      actions={
        <>
          {discard && (
            <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => actions.deleteItem(item, { reason: 'discard' })}>
              Thrown away
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => sheets.openExpiry(item.id)}>
            Update date
          </Button>
        </>
      }
    />
  );

  return (
    <>
      <AlertGroup title="Expired" tone="danger" count={expired.length}>
        {expired.map((i) => row(i, true))}
      </AlertGroup>
      <AlertGroup title="Expiring within 7 days" tone="amber" count={week.length}>
        {week.map((i) => row(i, false))}
      </AlertGroup>
      <AlertGroup title="Expiring within 30 days" tone="muted" count={month.length}>
        {month.map((i) => row(i, false))}
      </AlertGroup>
      <p className="text-sm text-stone-warm">Expired items are never removed automatically — you decide when to throw them away.</p>
    </>
  );
}
