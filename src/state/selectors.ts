import type { AppData, ExpiryStatus, PantryItem, ShoppingListItem, StockStatus } from '../types';
import { daysBetween, today } from '../lib/dates';
import { getExpiryStatus, getStockStatus } from '../lib/stock';

export interface ItemView extends PantryItem {
  stockStatus: StockStatus;
  expiryStatus: ExpiryStatus;
  onShoppingList: boolean;
}

export function toItemViews(data: AppData, now: string = today()): ItemView[] {
  const onList = new Set(
    data.shoppingList.filter((s) => !s.isCompleted && s.linkedPantryItemId).map((s) => s.linkedPantryItemId as string),
  );
  return data.items.map((item) => ({
    ...item,
    stockStatus: getStockStatus(item),
    expiryStatus: getExpiryStatus(item.expiryDate, now),
    onShoppingList: onList.has(item.id),
  }));
}

export function lowStockItems(views: ItemView[]) {
  const byName = (a: ItemView, b: ItemView) => a.name.localeCompare(b.name);
  return {
    out: views.filter((v) => v.stockStatus === 'out').sort(byName),
    low: views.filter((v) => v.stockStatus === 'low').sort(byName),
  };
}

export function expiryGroups(views: ItemView[]) {
  const byDate = (a: ItemView, b: ItemView) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? '');
  return {
    expired: views.filter((v) => v.expiryStatus === 'expired').sort(byDate),
    week: views.filter((v) => v.expiryStatus === 'week').sort(byDate),
    month: views.filter((v) => v.expiryStatus === 'month').sort(byDate),
  };
}

export function upcomingTrips(data: AppData, now: string = today()) {
  return data.trips
    .filter((t) => t.status === 'planned')
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate) || a.createdAt.localeCompare(b.createdAt))
    .map((t) => ({ ...t, daysAway: daysBetween(now, t.plannedDate) }));
}

export function tripItems(data: AppData, ids: string[]): ShoppingListItem[] {
  const map = new Map(data.shoppingList.map((s) => [s.id, s]));
  return ids.map((id) => map.get(id)).filter((s): s is ShoppingListItem => Boolean(s));
}

/** Purchased shopping-list entries whose quantity can be added straight to a pantry item. */
export function restockableEntries(data: AppData, ids?: string[]): ShoppingListItem[] {
  const scope = ids ? new Set(ids) : null;
  return data.shoppingList.filter((s) => {
    if (scope && !scope.has(s.id)) return false;
    if (!s.isCompleted || s.restockedAt || !s.linkedPantryItemId) return false;
    const item = data.items.find((i) => i.id === s.linkedPantryItemId);
    return Boolean(item && item.unit === s.unit);
  });
}

/** Group things by category, ordered by the category list so groups appear in a stable order. */
export function groupByCategory<T extends { categoryId: string }>(list: T[], categoryOrder: string[]): { categoryId: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const entry of list) {
    const bucket = groups.get(entry.categoryId);
    if (bucket) bucket.push(entry);
    else groups.set(entry.categoryId, [entry]);
  }
  const order = (id: string) => {
    const i = categoryOrder.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => order(a) - order(b))
    .map(([categoryId, items]) => ({ categoryId, items }));
}
