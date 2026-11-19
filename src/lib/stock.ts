import type { DateOnly, ExpiryStatus, PantryItem, StockStatus } from '../types';
import { daysBetween, today } from './dates';

export function getStockStatus(item: Pick<PantryItem, 'quantity' | 'minimumStock'>): StockStatus {
  if (item.quantity <= 0) return 'out';
  if (item.minimumStock > 0 && item.quantity <= item.minimumStock) return 'low';
  return 'in';
}

export const STOCK_LABELS: Record<StockStatus, string> = {
  in: 'In stock',
  low: 'Running low',
  out: 'Out of stock',
};

/** Used for "sort by stock status": most urgent first. */
export const STOCK_ORDER: Record<StockStatus, number> = { out: 0, low: 1, in: 2 };

export function getExpiryStatus(expiryDate: DateOnly | null, now: DateOnly = today()): ExpiryStatus {
  if (!expiryDate) return 'none';
  const days = daysBetween(now, expiryDate);
  if (days < 0) return 'expired';
  if (days <= 7) return 'week';
  if (days <= 30) return 'month';
  return 'ok';
}

export function daysUntilExpiry(expiryDate: DateOnly, now: DateOnly = today()): number {
  return daysBetween(now, expiryDate);
}

export function expiryText(expiryDate: DateOnly, now: DateOnly = today()): string {
  const days = daysBetween(now, expiryDate);
  if (days < -1) return `Expired ${Math.abs(days)} days ago`;
  if (days === -1) return 'Expired yesterday';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

/** A sensible amount to buy for a low or empty item: enough to get back to double the minimum. */
export function suggestedRestockQuantity(item: Pick<PantryItem, 'quantity' | 'minimumStock'>): number {
  const target = item.minimumStock > 0 ? item.minimumStock * 2 : 1;
  const need = Math.ceil(target - item.quantity);
  return Math.max(need, 1);
}
