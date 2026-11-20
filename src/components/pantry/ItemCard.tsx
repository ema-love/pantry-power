import { Minus, Plus, ShoppingBasket } from 'lucide-react';
import type { ItemView } from '../../state/selectors';
import { useStore } from '../../state/store';
import { useSheets } from '../AppSheets';
import { findCategory } from '../../lib/categories';
import { formatNumber } from '../../lib/format';
import { unitLabel } from '../../lib/units';
import { DemoBadge, ExpiryBadge, StockBadge } from '../ui/Badge';
import { Link } from '../ui/Button';
import { CategoryArt } from './CategoryArt';

export function ItemCard({ item }: { item: ItemView }) {
  const { data } = useStore();
  const sheets = useSheets();
  const category = findCategory(data.categories, item.categoryId);
  const qtyTone = item.stockStatus === 'out' ? 'text-danger-deep' : item.stockStatus === 'low' ? 'text-amber-deep' : 'text-charcoal';

  return (
    <article className="card relative flex flex-col gap-3 p-3.5 transition-shadow hover:shadow-lift sm:p-4">
      <div className="flex items-start gap-3.5">
        <CategoryArt category={category} image={item.image} size="md" alt={item.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-[1.05rem] font-bold leading-snug text-charcoal">
              <Link to={`/pantry/${item.id}`} className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none">
                <span className="break-words">{item.name}</span>
              </Link>
            </h3>
            {item.isDemo && <DemoBadge />}
          </div>
          <p className="truncate text-sm text-stone-warm">{category.name}{item.storageLocation ? ` · ${item.storageLocation}` : ''}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StockBadge status={item.stockStatus} />
            <ExpiryBadge status={item.expiryStatus} date={item.expiryDate} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line/70 pt-3">
        <p className={`tabular min-w-0 flex-1 ${qtyTone}`}>
          <span className="text-2xl font-extrabold">{formatNumber(item.quantity)}</span>{' '}
          <span className="text-[0.95rem] font-semibold text-stone-warm">{unitLabel(data.units, item.unit, item.quantity)}</span>
        </p>
        {item.stockStatus !== 'in' && !item.onShoppingList && (
          <button
            type="button"
            onClick={() => sheets.openShoppingForm({ fromItemId: item.id })}
            className="relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-xl text-terracotta-600 hover:bg-terracotta-50"
            aria-label={`Add ${item.name} to shopping list`}
            title="Add to shopping list"
          >
            <ShoppingBasket className="h-5 w-5" aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={() => sheets.openStock(item.id, 'consumption')}
          disabled={item.quantity <= 0}
          className="relative z-10 inline-flex h-11 items-center gap-1 rounded-xl border border-line bg-white px-3 text-sm font-bold text-charcoal hover:border-olive-300 hover:bg-olive-50 disabled:opacity-40"
          aria-label={`Use ${item.name}`}
        >
          <Minus className="h-4 w-4" aria-hidden strokeWidth={2.6} /> Use
        </button>
        <button
          type="button"
          onClick={() => sheets.openStock(item.id, 'addition')}
          className="relative z-10 inline-flex h-11 items-center gap-1 rounded-xl bg-olive-600 px-3 text-sm font-bold text-ivory hover:bg-olive-700"
          aria-label={`Add stock of ${item.name}`}
        >
          <Plus className="h-4 w-4" aria-hidden strokeWidth={2.6} /> Add
        </button>
      </div>
    </article>
  );
}
