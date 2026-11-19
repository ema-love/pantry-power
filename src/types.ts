/** ISO calendar date without time, e.g. "2026-11-19". Always interpreted in local time. */
export type DateOnly = string;
/** Full ISO timestamp, e.g. "2026-11-19T08:30:00.000Z". */
export type Timestamp = string;

export type CategoryTone = 'olive' | 'sage' | 'terracotta' | 'amber' | 'clay' | 'wheat' | 'sky' | 'plum';

export interface Category {
  id: string;
  name: string;
  /** Key into the curated icon map (see lib/icons). */
  icon: string;
  tone: CategoryTone;
  isCustom: boolean;
}

export interface Unit {
  id: string;
  singular: string;
  plural: string;
  isCustom: boolean;
}

export interface PantryItem {
  id: string;
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  minimumStock: number;
  expiryDate: DateOnly | null;
  purchaseDate: DateOnly | null;
  storageLocation: string;
  /** Downscaled data URL, or null to use the category illustration. */
  image: string | null;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDemo?: boolean;
}

export type TransactionType = 'addition' | 'consumption' | 'adjustment';

export interface StockTransaction {
  id: string;
  itemId: string;
  /** Snapshot of the item name, so history still reads well after an item is deleted. */
  itemName: string;
  transactionType: TransactionType;
  /** Always positive: how much was added, used, or the size of the correction. */
  quantity: number;
  /** Signed change applied to the item (+ added, − removed). */
  delta: number;
  unit: string;
  balanceAfter: number;
  date: Timestamp;
  notes: string;
  isDemo?: boolean;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  notes: string;
  isCompleted: boolean;
  linkedPantryItemId: string | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  /** Set once a purchased item's quantity has been added to pantry stock. */
  restockedAt: Timestamp | null;
  isDemo?: boolean;
}

export type TripStatus = 'planned' | 'completed';

export interface TripItemSnapshot {
  name: string;
  quantity: number;
  unit: string;
  isCompleted: boolean;
}

export interface MarketTrip {
  id: string;
  title: string;
  /** IDs of ShoppingListItems attached to this trip. */
  shoppingListItems: string[];
  plannedDate: DateOnly;
  reminderEnabled: boolean;
  notes: string;
  status: TripStatus;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  /** Frozen copy of the list when the trip was completed, so history survives list clean-up. */
  itemsSnapshot: TripItemSnapshot[] | null;
  /** Local dates on which a browser notification has already been shown. */
  notifiedOn: DateOnly[];
  isDemo?: boolean;
}

export interface Settings {
  householdName: string;
  /** Unit IDs shown in pickers. */
  preferredUnits: string[];
  remindersEnabled: boolean;
  remindDayBefore: boolean;
  welcomeDismissed: boolean;
}

export interface AppData {
  schemaVersion: number;
  settings: Settings;
  categories: Category[];
  units: Unit[];
  items: PantryItem[];
  transactions: StockTransaction[];
  shoppingList: ShoppingListItem[];
  trips: MarketTrip[];
}

export type StockStatus = 'in' | 'low' | 'out';
export type ExpiryStatus = 'none' | 'ok' | 'month' | 'week' | 'expired';
