import type { DateOnly } from '../types';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Format a Date as a local YYYY-MM-DD string. */
export function toDateOnly(d: Date): DateOnly {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(now: Date = new Date()): DateOnly {
  return toDateOnly(now);
}

/** Parse a YYYY-MM-DD string as a local date (midnight). Returns null when invalid. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  // Reject roll-overs such as 2026-02-31.
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) {
    return null;
  }
  return date;
}

export function isValidDateOnly(value: unknown): value is DateOnly {
  return typeof value === 'string' && parseDateOnly(value) !== null;
}

export function addDays(date: DateOnly, days: number): DateOnly {
  const d = parseDateOnly(date) ?? new Date();
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: DateOnly, to: DateOnly): number {
  const a = parseDateOnly(from);
  const b = parseDateOnly(to);
  if (!a || !b) return 0;
  // Use UTC to sidestep daylight-saving shifts.
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

const LOCALE = 'en-GB';

export function formatDate(value: DateOnly | null | undefined, opts?: { withWeekday?: boolean; withYear?: boolean }): string {
  const d = parseDateOnly(value ?? null);
  if (!d) return '';
  const withYear = opts?.withYear ?? d.getFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString(LOCALE, {
    weekday: opts?.withWeekday ? 'long' : undefined,
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
  });
}

export function formatLongToday(now: Date = new Date()): string {
  return now.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Friendly relative description of a calendar date, e.g. "today", "tomorrow", "in 5 days", "3 days ago". */
export function relativeDay(value: DateOnly, now: DateOnly = today()): string {
  const diff = daysBetween(now, value);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 1) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export function formatTimestamp(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const day = toDateOnly(d);
  const time = d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
  const diff = daysBetween(day, today());
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Yesterday, ${time}`;
  return `${formatDate(day)}, ${time}`;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
