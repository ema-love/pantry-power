import type { ReactNode } from 'react';
import type { PantryItem } from '../../types';
import { useStore } from '../../state/store';
import { findCategory } from '../../lib/categories';
import { formatQty } from '../../lib/format';
import { Link } from '../ui/Button';
import { DemoBadge } from '../ui/Badge';
import { CategoryArt } from './CategoryArt';

/** Compact item row used in alert lists: picture, name, a status line and actions. */
export function AttentionRow({ item, detail, actions, stackActions }: { item: PantryItem; detail?: ReactNode; actions?: ReactNode; stackActions?: boolean }) {
  const { data } = useStore();
  const category = findCategory(data.categories, item.categoryId);
  return (
    <li className={`flex items-center gap-x-3 gap-y-2 px-3.5 py-3 sm:flex-nowrap sm:px-4 ${stackActions ? 'flex-wrap' : ''}`}>
      <Link to={`/pantry/${item.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl">
        <CategoryArt category={category} image={item.image} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-bold text-charcoal">{item.name}</span>
            {item.isDemo && <DemoBadge />}
          </span>
          <span className="block text-sm text-stone-warm">{detail ?? `${formatQty(item.quantity, item.unit, data.units)} left`}</span>
        </span>
      </Link>
      {actions && <div className={`flex shrink-0 justify-end gap-2 ${stackActions ? 'w-full sm:w-auto' : ''}`}>{actions}</div>}
    </li>
  );
}
