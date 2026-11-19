/**
 * Defensive parsing of persisted / imported data.
 * Anything malformed is repaired where possible and dropped where not, so a single
 * bad record never prevents the household from opening the app.
 */
import type {
  AppData, Category, CategoryTone, MarketTrip, PantryItem, Settings, ShoppingListItem,
  StockTransaction, TransactionType, TripItemSnapshot, Unit,
} from '../types';
import { DEFAULT_CATEGORIES, OTHER_CATEGORY_ID, TONES } from './categories';
import { isValidDateOnly } from './dates';
import { CATEGORY_ICONS } from './icons';
import { DEFAULT_PREFERRED_UNITS, DEFAULT_UNITS } from './units';
import { MAX_QUANTITY } from './validation';

export const SCHEMA_VERSION = 1;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const trimmed = (v: unknown, max: number, fallback = ''): string => str(v, fallback).trim().slice(0, max);
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);
const qty = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n * 100) / 100, MAX_QUANTITY);
};
const dateOrNull = (v: unknown): string | null => (isValidDateOnly(v) ? v : null);
const timestamp = (v: unknown, fallback: string): string =>
  typeof v === 'string' && !Number.isNaN(new Date(v).getTime()) ? v : fallback;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const demoFlag = (o: Obj) => (o.isDemo === true ? { isDemo: true as const } : {});

export function createEmptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(),
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    units: DEFAULT_UNITS.map((u) => ({ ...u })),
    items: [],
    transactions: [],
    shoppingList: [],
    trips: [],
  };
}

export function defaultSettings(): Settings {
  return {
    householdName: '',
    preferredUnits: [...DEFAULT_PREFERRED_UNITS],
    remindersEnabled: true,
    remindDayBefore: true,
    welcomeDismissed: false,
  };
}

function sanitizeCategories(raw: unknown): Category[] {
  const result: Category[] = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  for (const entry of arr(raw)) {
    if (!isObj(entry) || !entry.isCustom) continue;
    const id = str(entry.id);
    const name = trimmed(entry.name, 40);
    if (!id || !name || result.some((c) => c.id === id)) continue;
    const icon = typeof entry.icon === 'string' && entry.icon in CATEGORY_ICONS ? entry.icon : 'box';
    const tone = TONES.includes(entry.tone as CategoryTone) ? (entry.tone as CategoryTone) : 'sage';
    result.push({ id, name, icon, tone, isCustom: true });
  }
  return result;
}

function sanitizeUnits(raw: unknown): Unit[] {
  const result: Unit[] = DEFAULT_UNITS.map((u) => ({ ...u }));
  for (const entry of arr(raw)) {
    if (!isObj(entry) || !entry.isCustom) continue;
    const id = str(entry.id);
    const singular = trimmed(entry.singular, 24);
    if (!id || !singular || result.some((u) => u.id === id)) continue;
    result.push({ id, singular, plural: trimmed(entry.plural, 24) || singular, isCustom: true });
  }
  return result;
}

function sanitizeSettings(raw: unknown, units: Unit[]): Settings {
  const base = defaultSettings();
  if (!isObj(raw)) return base;
  const unitIds = new Set(units.map((u) => u.id));
  const preferred = arr(raw.preferredUnits).filter((x): x is string => typeof x === 'string' && unitIds.has(x));
  return {
    householdName: trimmed(raw.householdName, 60),
    preferredUnits: preferred.length ? Array.from(new Set(preferred)) : base.preferredUnits,
    remindersEnabled: bool(raw.remindersEnabled, base.remindersEnabled),
    remindDayBefore: bool(raw.remindDayBefore, base.remindDayBefore),
    welcomeDismissed: bool(raw.welcomeDismissed, false),
  };
}

function sanitizeItem(o: unknown, categoryIds: Set<string>, now: string): PantryItem | null {
  if (!isObj(o)) return null;
  const id = str(o.id);
  const name = trimmed(o.name, 60);
  const unit = str(o.unit).trim();
  if (!id || !name || !unit) return null;
  const image = typeof o.image === 'string' && o.image.startsWith('data:image/') ? o.image : null;
  return {
    id,
    name,
    categoryId: categoryIds.has(str(o.categoryId)) ? str(o.categoryId) : OTHER_CATEGORY_ID,
    quantity: qty(o.quantity),
    unit,
    minimumStock: qty(o.minimumStock),
    expiryDate: dateOrNull(o.expiryDate),
    purchaseDate: dateOrNull(o.purchaseDate),
    storageLocation: trimmed(o.storageLocation, 60),
    image,
    notes: trimmed(o.notes, 500),
    createdAt: timestamp(o.createdAt, now),
    updatedAt: timestamp(o.updatedAt, now),
    ...demoFlag(o),
  };
}

const TX_TYPES: TransactionType[] = ['addition', 'consumption', 'adjustment'];

function sanitizeTransaction(o: unknown, now: string): StockTransaction | null {
  if (!isObj(o)) return null;
  const id = str(o.id);
  const itemId = str(o.itemId);
  const type = o.transactionType as TransactionType;
  if (!id || !itemId || !TX_TYPES.includes(type)) return null;
  const delta = typeof o.delta === 'number' && Number.isFinite(o.delta) ? o.delta : 0;
  return {
    id,
    itemId,
    itemName: trimmed(o.itemName, 60) || 'Item',
    transactionType: type,
    quantity: qty(o.quantity),
    delta,
    unit: str(o.unit),
    balanceAfter: qty(o.balanceAfter),
    date: timestamp(o.date, now),
    notes: trimmed(o.notes, 500),
    ...demoFlag(o),
  };
}

function sanitizeShopping(o: unknown, categoryIds: Set<string>, itemIds: Set<string>, now: string): ShoppingListItem | null {
  if (!isObj(o)) return null;
  const id = str(o.id);
  const name = trimmed(o.name, 60);
  if (!id || !name) return null;
  const linked = str(o.linkedPantryItemId);
  const isCompleted = bool(o.isCompleted);
  return {
    id,
    name,
    categoryId: categoryIds.has(str(o.categoryId)) ? str(o.categoryId) : OTHER_CATEGORY_ID,
    quantity: qty(o.quantity) || 1,
    unit: str(o.unit).trim() || 'piece',
    notes: trimmed(o.notes, 500),
    isCompleted,
    linkedPantryItemId: linked && itemIds.has(linked) ? linked : null,
    createdAt: timestamp(o.createdAt, now),
    completedAt: isCompleted ? timestamp(o.completedAt, now) : null,
    restockedAt: typeof o.restockedAt === 'string' ? timestamp(o.restockedAt, now) : null,
    ...demoFlag(o),
  };
}

function sanitizeSnapshot(raw: unknown): TripItemSnapshot[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(isObj).map((s) => ({
    name: trimmed(s.name, 60) || 'Item',
    quantity: qty(s.quantity),
    unit: str(s.unit),
    isCompleted: bool(s.isCompleted),
  }));
}

function sanitizeTrip(o: unknown, shoppingIds: Set<string>, now: string): MarketTrip | null {
  if (!isObj(o)) return null;
  const id = str(o.id);
  const plannedDate = dateOrNull(o.plannedDate);
  if (!id || !plannedDate) return null;
  const status = o.status === 'completed' ? 'completed' : 'planned';
  return {
    id,
    title: trimmed(o.title, 60) || 'Market trip',
    shoppingListItems: arr(o.shoppingListItems).filter((x): x is string => typeof x === 'string' && shoppingIds.has(x)),
    plannedDate,
    reminderEnabled: bool(o.reminderEnabled),
    notes: trimmed(o.notes, 500),
    status,
    createdAt: timestamp(o.createdAt, now),
    completedAt: status === 'completed' ? timestamp(o.completedAt, now) : null,
    itemsSnapshot: status === 'completed' ? sanitizeSnapshot(o.itemsSnapshot) : null,
    notifiedOn: arr(o.notifiedOn).filter(isValidDateOnly).slice(-10),
    ...demoFlag(o),
  };
}

function dedupe<T extends { id: string }>(list: (T | null)[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of list) {
    if (x && !seen.has(x.id)) {
      seen.add(x.id);
      out.push(x);
    }
  }
  return out;
}

export interface SanitizeReport {
  data: AppData;
  /** Number of records that could not be recovered. */
  dropped: number;
}

/** Turn arbitrary JSON into valid AppData. Throws only if the input is not an object at all. */
export function sanitizeData(raw: unknown): SanitizeReport {
  if (!isObj(raw)) throw new Error('This file does not contain Pantry Power data.');
  const now = new Date().toISOString();
  const categories = sanitizeCategories(raw.categories);
  const units = sanitizeUnits(raw.units);
  const categoryIds = new Set(categories.map((c) => c.id));

  const rawItems = arr(raw.items);
  const items = dedupe(rawItems.map((o) => sanitizeItem(o, categoryIds, now)));
  const itemIds = new Set(items.map((i) => i.id));

  const rawTx = arr(raw.transactions);
  const transactions = dedupe(rawTx.map((o) => sanitizeTransaction(o, now)));

  const rawShopping = arr(raw.shoppingList);
  const shoppingList = dedupe(rawShopping.map((o) => sanitizeShopping(o, categoryIds, itemIds, now)));
  const shoppingIds = new Set(shoppingList.map((s) => s.id));

  const rawTrips = arr(raw.trips);
  const trips = dedupe(rawTrips.map((o) => sanitizeTrip(o, shoppingIds, now)));

  const dropped =
    rawItems.length - items.length +
    rawTx.length - transactions.length +
    rawShopping.length - shoppingList.length +
    rawTrips.length - trips.length;

  return {
    data: {
      schemaVersion: SCHEMA_VERSION,
      settings: sanitizeSettings(raw.settings, units),
      categories,
      units,
      items,
      transactions,
      shoppingList,
      trips,
    },
    dropped,
  };
}
