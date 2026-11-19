import type { Unit } from '../types';
import { unitLabel } from './units';

/** Round to at most 2 decimals and drop trailing zeros. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('en-NG', { maximumFractionDigits: 2 });
}

export function roundQty(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatQty(quantity: number, unitId: string, units: Unit[]): string {
  return `${formatNumber(quantity)} ${unitLabel(units, unitId, quantity)}`;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
