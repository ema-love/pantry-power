import { isValidDateOnly, today } from './dates';

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export const MAX_QUANTITY = 1_000_000;
export const MAX_NAME_LENGTH = 60;
export const MAX_NOTES_LENGTH = 500;

/**
 * Parse a user-entered quantity. Accepts "2", "2.5", "2,5" and trims spaces.
 * Returns a number or an error message.
 */
export function parseQuantity(raw: string, opts: { allowZero?: boolean; label?: string } = {}): number | string {
  const label = opts.label ?? 'Quantity';
  const value = raw.trim().replace(',', '.');
  if (value === '') return `${label} is required`;
  if (!/^\d*\.?\d+$|^\d+\.$/.test(value)) {
    return value.startsWith('-') ? `${label} cannot be negative` : `Enter a number, like 2 or 2.5`;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Enter a valid number';
  if (n < 0) return `${label} cannot be negative`;
  if (!opts.allowZero && n === 0) return `${label} must be more than 0`;
  if (n > MAX_QUANTITY) return `${label} is too large`;
  return Math.round(n * 100) / 100;
}

export function validateName(raw: string, label = 'Name'): string | undefined {
  const value = raw.trim();
  if (!value) return `${label} is required`;
  if (value.length > MAX_NAME_LENGTH) return `${label} must be ${MAX_NAME_LENGTH} characters or fewer`;
  return undefined;
}

export function validateOptionalDate(
  raw: string,
  opts: { notInFuture?: boolean; notInPast?: boolean; label?: string } = {},
): string | undefined {
  if (!raw) return undefined;
  const label = opts.label ?? 'Date';
  if (!isValidDateOnly(raw)) return `${label} is not a valid date`;
  const year = Number(raw.slice(0, 4));
  if (year < 1990 || year > 2100) return `${label} looks wrong — please check the year`;
  if (opts.notInFuture && raw > today()) return `${label} cannot be in the future`;
  if (opts.notInPast && raw < today()) return `${label} cannot be in the past`;
  return undefined;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
