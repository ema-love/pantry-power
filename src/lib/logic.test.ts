import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isValidDateOnly, today } from './dates';
import { getExpiryStatus, getStockStatus, suggestedRestockQuantity } from './stock';
import { parseQuantity, validateOptionalDate } from './validation';
import { createEmptyData, sanitizeData } from './sanitize';
import { parseBackup, createBackup } from './storage';
import { dueReminders } from './reminders';

describe('stock status', () => {
  it('is out of stock at zero', () => expect(getStockStatus({ quantity: 0, minimumStock: 2 })).toBe('out'));
  it('is running low at the threshold', () => expect(getStockStatus({ quantity: 2, minimumStock: 2 })).toBe('low'));
  it('is running low below the threshold', () => expect(getStockStatus({ quantity: 1.5, minimumStock: 2 })).toBe('low'));
  it('is in stock above the threshold', () => expect(getStockStatus({ quantity: 2.01, minimumStock: 2 })).toBe('in'));
  it('is in stock with no threshold', () => expect(getStockStatus({ quantity: 1, minimumStock: 0 })).toBe('in'));
  it('suggests enough to reach double the minimum', () => {
    expect(suggestedRestockQuantity({ quantity: 1, minimumStock: 5 })).toBe(9);
    expect(suggestedRestockQuantity({ quantity: 0, minimumStock: 0 })).toBe(1);
  });
});

describe('expiry status', () => {
  const now = '2026-11-19';
  it('ignores items without a date', () => expect(getExpiryStatus(null, now)).toBe('none'));
  it('flags yesterday as expired', () => expect(getExpiryStatus('2026-11-18', now)).toBe('expired'));
  it('treats today as within a week, not expired', () => expect(getExpiryStatus('2026-11-19', now)).toBe('week'));
  it('7 days is within a week', () => expect(getExpiryStatus('2026-11-26', now)).toBe('week'));
  it('8–30 days is within a month', () => {
    expect(getExpiryStatus('2026-11-27', now)).toBe('month');
    expect(getExpiryStatus('2026-12-19', now)).toBe('month');
  });
  it('31+ days is fine', () => expect(getExpiryStatus('2026-12-20', now)).toBe('ok'));
});

describe('dates', () => {
  it('rejects impossible dates', () => {
    expect(isValidDateOnly('2026-02-31')).toBe(false);
    expect(isValidDateOnly('2026-13-01')).toBe(false);
    expect(isValidDateOnly('hello')).toBe(false);
    expect(isValidDateOnly('2028-02-29')).toBe(true);
  });
  it('counts days across month ends', () => {
    expect(daysBetween('2026-11-30', '2026-12-01')).toBe(1);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('quantity validation', () => {
  it('accepts decimals and commas', () => {
    expect(parseQuantity('2.5')).toBe(2.5);
    expect(parseQuantity('2,5')).toBe(2.5);
    expect(parseQuantity(' 10 ')).toBe(10);
  });
  it('rejects negatives, text and empty', () => {
    expect(parseQuantity('-1')).toMatch(/negative/);
    expect(parseQuantity('abc')).toMatch(/number/);
    expect(parseQuantity('')).toMatch(/required/);
  });
  it('rejects zero unless allowed', () => {
    expect(typeof parseQuantity('0')).toBe('string');
    expect(parseQuantity('0', { allowZero: true })).toBe(0);
  });
  it('validates dates', () => {
    expect(validateOptionalDate('')).toBeUndefined();
    expect(validateOptionalDate('2026-02-30')).toMatch(/valid/);
    expect(validateOptionalDate(addDays(today(), 3), { notInFuture: true })).toMatch(/future/);
    expect(validateOptionalDate(addDays(today(), -3), { notInPast: true })).toMatch(/past/);
  });
});

describe('sanitizing stored or imported data', () => {
  it('rejects non-objects', () => {
    expect(() => sanitizeData('nope')).toThrow();
    expect(() => parseBackup('not json')).toThrow();
    expect(() => parseBackup('{"foo":1}')).toThrow();
  });

  it('repairs and drops bad records without losing good ones', () => {
    const raw = {
      items: [
        { id: 'a', name: 'Rice', categoryId: 'grains', quantity: 5, unit: 'kg', minimumStock: 2 },
        { id: 'b', name: 'Beans', categoryId: 'does-not-exist', quantity: -4, unit: 'kg', expiryDate: '2026-02-31' },
        { id: 'c', name: '', unit: 'kg' },
        'garbage',
        { id: 'a', name: 'Duplicate', unit: 'kg' },
      ],
      shoppingList: [{ id: 's1', name: 'Oil', linkedPantryItemId: 'zzz', quantity: 0 }],
      trips: [{ id: 't1', plannedDate: 'bad' }, { id: 't2', plannedDate: '2026-12-01', shoppingListItems: ['s1', 'missing'] }],
      transactions: [{ id: 'x', itemId: 'a', transactionType: 'weird' }],
    };
    const { data, dropped } = sanitizeData(raw);
    expect(data.items.map((i) => i.name)).toEqual(['Rice', 'Beans']);
    const beans = data.items[1];
    expect(beans.quantity).toBe(0);
    expect(beans.categoryId).toBe('other');
    expect(beans.expiryDate).toBeNull();
    expect(data.shoppingList[0].linkedPantryItemId).toBeNull();
    expect(data.shoppingList[0].quantity).toBe(1);
    expect(data.trips).toHaveLength(1);
    expect(data.trips[0].shoppingListItems).toEqual(['s1']);
    expect(dropped).toBe(3 + 1 + 1);
    expect(data.categories.length).toBeGreaterThan(5);
  });

  it('round-trips a backup', () => {
    const data = createEmptyData();
    data.settings.householdName = 'Test Home';
    const restored = parseBackup(JSON.stringify(createBackup(data)));
    expect(restored.data.settings.householdName).toBe('Test Home');
    expect(restored.dropped).toBe(0);
  });
});

describe('reminders', () => {
  const base = () => {
    const data = createEmptyData();
    const now = today();
    data.trips = [
      { id: 'today', title: 'A', shoppingListItems: [], plannedDate: now, reminderEnabled: true, notes: '', status: 'planned', createdAt: '', completedAt: null, itemsSnapshot: null, notifiedOn: [] },
      { id: 'tomorrow', title: 'B', shoppingListItems: [], plannedDate: addDays(now, 1), reminderEnabled: true, notes: '', status: 'planned', createdAt: '', completedAt: null, itemsSnapshot: null, notifiedOn: [] },
      { id: 'later', title: 'C', shoppingListItems: [], plannedDate: addDays(now, 5), reminderEnabled: true, notes: '', status: 'planned', createdAt: '', completedAt: null, itemsSnapshot: null, notifiedOn: [] },
      { id: 'off', title: 'D', shoppingListItems: [], plannedDate: now, reminderEnabled: false, notes: '', status: 'planned', createdAt: '', completedAt: null, itemsSnapshot: null, notifiedOn: [] },
      { id: 'done', title: 'E', shoppingListItems: [], plannedDate: now, reminderEnabled: true, notes: '', status: 'completed', createdAt: '', completedAt: '', itemsSnapshot: [], notifiedOn: [] },
    ];
    return data;
  };
  it('includes today and tomorrow, skips later, disabled and completed trips', () => {
    expect(dueReminders(base()).map((d) => d.trip.id)).toEqual(['today', 'tomorrow']);
  });
  it('respects the day-before preference and global switch', () => {
    const data = base();
    data.settings.remindDayBefore = false;
    expect(dueReminders(data).map((d) => d.trip.id)).toEqual(['today']);
    data.settings.remindersEnabled = false;
    expect(dueReminders(data)).toEqual([]);
  });
});
