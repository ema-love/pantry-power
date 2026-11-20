import type {
  AppData, Category, MarketTrip, PantryItem, Settings, ShoppingListItem, StockTransaction, TransactionType, Unit,
} from '../types';
import { OTHER_CATEGORY_ID } from '../lib/categories';
import { buildDemoData } from '../lib/demo';
import { createId } from '../lib/id';
import { roundQty } from '../lib/format';
import { createEmptyData } from '../lib/sanitize';

/** Fields a user supplies when creating or editing a pantry item. */
export type PantryItemInput = Pick<
  PantryItem,
  'name' | 'categoryId' | 'quantity' | 'unit' | 'minimumStock' | 'expiryDate' | 'purchaseDate' | 'storageLocation' | 'image' | 'notes'
>;

export type ShoppingItemInput = Pick<ShoppingListItem, 'name' | 'categoryId' | 'quantity' | 'unit' | 'notes' | 'linkedPantryItemId'>;

export type TripInput = Pick<MarketTrip, 'title' | 'plannedDate' | 'reminderEnabled' | 'notes' | 'shoppingListItems'>;

export type Action =
  | { type: 'item/add'; id: string; input: PantryItemInput; at: string }
  | { type: 'item/update'; id: string; input: PantryItemInput; at: string }
  | { type: 'item/delete'; id: string }
  | { type: 'item/restore'; item: PantryItem; transactions: StockTransaction[]; shoppingLinks: string[] }
  | { type: 'stock/change'; txId: string; itemId: string; kind: 'addition' | 'consumption'; amount: number; notes: string; purchaseDate: string | null; at: string }
  | { type: 'stock/undo'; txId: string }
  | { type: 'item/setExpiry'; id: string; expiryDate: string | null; at: string }
  | { type: 'category/add'; category: Category }
  | { type: 'category/delete'; id: string }
  | { type: 'unit/add'; unit: Unit }
  | { type: 'unit/delete'; id: string }
  | { type: 'shopping/add'; items: (ShoppingItemInput & { id: string })[]; at: string }
  | { type: 'shopping/update'; id: string; input: ShoppingItemInput }
  | { type: 'shopping/toggle'; id: string; at: string }
  | { type: 'shopping/remove'; id: string }
  | { type: 'shopping/restore'; entry: ShoppingListItem; tripIds: string[] }
  | { type: 'shopping/clearCompleted' }
  | { type: 'shopping/restock'; ids: string[]; at: string }
  | { type: 'trip/add'; id: string; input: TripInput; at: string }
  | { type: 'trip/update'; id: string; input: TripInput }
  | { type: 'trip/complete'; id: string; at: string }
  | { type: 'trip/reopen'; id: string }
  | { type: 'trip/delete'; id: string }
  | { type: 'trip/markNotified'; id: string; date: string }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'demo/load' }
  | { type: 'demo/remove' }
  | { type: 'data/replace'; data: AppData }
  | { type: 'data/clear' };

function makeTx(
  item: PantryItem,
  type: TransactionType,
  delta: number,
  at: string,
  notes = '',
  id = createId('tx'),
): StockTransaction {
  return {
    id,
    itemId: item.id,
    itemName: item.name,
    transactionType: type,
    quantity: roundQty(Math.abs(delta)),
    delta: roundQty(delta),
    unit: item.unit,
    balanceAfter: item.quantity,
    date: at,
    notes,
    ...(item.isDemo ? { isDemo: true } : {}),
  };
}

/** Keep history bounded so on-device storage never fills up from transactions alone. */
const MAX_TRANSACTIONS = 2000;
const capTransactions = (txs: StockTransaction[]) => (txs.length > MAX_TRANSACTIONS ? txs.slice(-MAX_TRANSACTIONS) : txs);

function updateItem(state: AppData, id: string, fn: (item: PantryItem) => PantryItem): AppData {
  return { ...state, items: state.items.map((i) => (i.id === id ? fn(i) : i)) };
}

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'item/add': {
      const item: PantryItem = {
        ...action.input,
        id: action.id,
        quantity: roundQty(action.input.quantity),
        createdAt: action.at,
        updatedAt: action.at,
      };
      const txs = item.quantity > 0 ? [makeTx(item, 'addition', item.quantity, action.at, 'Added to pantry')] : [];
      return { ...state, items: [...state.items, item], transactions: capTransactions([...state.transactions, ...txs]) };
    }

    case 'item/update': {
      const existing = state.items.find((i) => i.id === action.id);
      if (!existing) return state;
      const updated: PantryItem = {
        ...existing,
        ...action.input,
        quantity: roundQty(action.input.quantity),
        updatedAt: action.at,
      };
      const delta = roundQty(updated.quantity - existing.quantity);
      const txs = delta !== 0 ? [makeTx(updated, 'adjustment', delta, action.at, 'Quantity corrected')] : [];
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? updated : i)),
        transactions: capTransactions([...state.transactions, ...txs]),
      };
    }

    case 'item/delete':
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.id),
        transactions: state.transactions.filter((t) => t.itemId !== action.id),
        shoppingList: state.shoppingList.map((s) =>
          s.linkedPantryItemId === action.id ? { ...s, linkedPantryItemId: null } : s,
        ),
      };

    case 'item/restore': {
      if (state.items.some((i) => i.id === action.item.id)) return state;
      const links = new Set(action.shoppingLinks);
      return {
        ...state,
        items: [...state.items, action.item],
        transactions: capTransactions([...state.transactions, ...action.transactions].sort((a, b) => a.date.localeCompare(b.date))),
        shoppingList: state.shoppingList.map((s) => (links.has(s.id) ? { ...s, linkedPantryItemId: action.item.id } : s)),
      };
    }

    case 'stock/change': {
      const item = state.items.find((i) => i.id === action.itemId);
      if (!item || !(action.amount > 0)) return state;
      const signed = action.kind === 'addition' ? action.amount : -action.amount;
      // Never allow negative stock, even if the UI is bypassed.
      const quantity = roundQty(Math.max(0, item.quantity + signed));
      const actualDelta = roundQty(quantity - item.quantity);
      if (actualDelta === 0) return state;
      const updated: PantryItem = {
        ...item,
        quantity,
        updatedAt: action.at,
        purchaseDate: action.kind === 'addition' && action.purchaseDate ? action.purchaseDate : item.purchaseDate,
      };
      return {
        ...updateItem(state, item.id, () => updated),
        transactions: capTransactions([
          ...state.transactions,
          makeTx(updated, action.kind, actualDelta, action.at, action.notes, action.txId),
        ]),
      };
    }

    case 'stock/undo': {
      const tx = state.transactions.find((t) => t.id === action.txId);
      if (!tx) return state;
      const next = { ...state, transactions: state.transactions.filter((t) => t.id !== tx.id) };
      return updateItem(next, tx.itemId, (i) => ({ ...i, quantity: roundQty(Math.max(0, i.quantity - tx.delta)) }));
    }

    case 'item/setExpiry':
      return updateItem(state, action.id, (i) => ({ ...i, expiryDate: action.expiryDate, updatedAt: action.at }));

    case 'category/add':
      if (state.categories.some((c) => c.id === action.category.id)) return state;
      return { ...state, categories: [...state.categories, action.category] };

    case 'category/delete': {
      const cat = state.categories.find((c) => c.id === action.id);
      if (!cat || !cat.isCustom) return state;
      const move = <T extends { categoryId: string }>(x: T): T => (x.categoryId === action.id ? { ...x, categoryId: OTHER_CATEGORY_ID } : x);
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        items: state.items.map(move),
        shoppingList: state.shoppingList.map(move),
      };
    }

    case 'unit/add':
      if (state.units.some((u) => u.id === action.unit.id)) return state;
      return {
        ...state,
        units: [...state.units, action.unit],
        settings: { ...state.settings, preferredUnits: [...state.settings.preferredUnits, action.unit.id] },
      };

    case 'unit/delete': {
      const unit = state.units.find((u) => u.id === action.id);
      if (!unit?.isCustom) return state;
      const inUse = state.items.some((i) => i.unit === action.id) || state.shoppingList.some((s) => s.unit === action.id);
      return {
        ...state,
        // Keep the unit definition if anything still uses it, so labels stay correct.
        units: inUse ? state.units : state.units.filter((u) => u.id !== action.id),
        settings: { ...state.settings, preferredUnits: state.settings.preferredUnits.filter((id) => id !== action.id) },
      };
    }

    case 'shopping/add': {
      const added: ShoppingListItem[] = action.items.map((input) => ({
        ...input,
        quantity: roundQty(input.quantity),
        isCompleted: false,
        createdAt: action.at,
        completedAt: null,
        restockedAt: null,
      }));
      return { ...state, shoppingList: [...state.shoppingList, ...added] };
    }

    case 'shopping/update':
      return {
        ...state,
        shoppingList: state.shoppingList.map((s) =>
          s.id === action.id ? { ...s, ...action.input, quantity: roundQty(action.input.quantity) } : s,
        ),
      };

    case 'shopping/toggle':
      return {
        ...state,
        shoppingList: state.shoppingList.map((s) =>
          s.id === action.id
            ? { ...s, isCompleted: !s.isCompleted, completedAt: s.isCompleted ? null : action.at, restockedAt: s.isCompleted ? null : s.restockedAt }
            : s,
        ),
      };

    case 'shopping/remove':
      return {
        ...state,
        shoppingList: state.shoppingList.filter((s) => s.id !== action.id),
        trips: state.trips.map((t) => ({ ...t, shoppingListItems: t.shoppingListItems.filter((id) => id !== action.id) })),
      };

    case 'shopping/restore': {
      if (state.shoppingList.some((s) => s.id === action.entry.id)) return state;
      const tripIds = new Set(action.tripIds);
      return {
        ...state,
        shoppingList: [...state.shoppingList, action.entry],
        trips: state.trips.map((t) => (tripIds.has(t.id) ? { ...t, shoppingListItems: [...t.shoppingListItems, action.entry.id] } : t)),
      };
    }

    case 'shopping/clearCompleted': {
      const remove = new Set(state.shoppingList.filter((s) => s.isCompleted).map((s) => s.id));
      return {
        ...state,
        shoppingList: state.shoppingList.filter((s) => !remove.has(s.id)),
        trips: state.trips.map((t) => ({ ...t, shoppingListItems: t.shoppingListItems.filter((id) => !remove.has(id)) })),
      };
    }

    case 'shopping/restock': {
      let next = state;
      const ids = new Set(action.ids);
      for (const entry of state.shoppingList) {
        if (!ids.has(entry.id) || !entry.isCompleted || entry.restockedAt || !entry.linkedPantryItemId) continue;
        const item = next.items.find((i) => i.id === entry.linkedPantryItemId);
        if (!item || item.unit !== entry.unit) continue;
        const updated: PantryItem = {
          ...item,
          quantity: roundQty(item.quantity + entry.quantity),
          purchaseDate: action.at.slice(0, 10),
          updatedAt: action.at,
        };
        next = {
          ...updateItem(next, item.id, () => updated),
          transactions: [...next.transactions, makeTx(updated, 'addition', entry.quantity, action.at, 'Bought from shopping list')],
          shoppingList: next.shoppingList.map((s) => (s.id === entry.id ? { ...s, restockedAt: action.at } : s)),
        };
      }
      return { ...next, transactions: capTransactions(next.transactions) };
    }

    case 'trip/add': {
      const trip: MarketTrip = {
        ...action.input,
        id: action.id,
        status: 'planned',
        createdAt: action.at,
        completedAt: null,
        itemsSnapshot: null,
        notifiedOn: [],
      };
      return { ...state, trips: [...state.trips, trip] };
    }

    case 'trip/update':
      return {
        ...state,
        trips: state.trips.map((t) =>
          t.id === action.id
            ? { ...t, ...action.input, notifiedOn: t.plannedDate === action.input.plannedDate ? t.notifiedOn : [] }
            : t,
        ),
      };

    case 'trip/complete':
      return {
        ...state,
        trips: state.trips.map((t) => {
          if (t.id !== action.id) return t;
          const snapshot = t.shoppingListItems
            .map((id) => state.shoppingList.find((s) => s.id === id))
            .filter((s): s is ShoppingListItem => Boolean(s))
            .map((s) => ({ name: s.name, quantity: s.quantity, unit: s.unit, isCompleted: s.isCompleted }));
          return { ...t, status: 'completed', completedAt: action.at, itemsSnapshot: snapshot };
        }),
      };

    case 'trip/reopen':
      return {
        ...state,
        trips: state.trips.map((t) => (t.id === action.id ? { ...t, status: 'planned', completedAt: null, itemsSnapshot: null } : t)),
      };

    case 'trip/delete':
      return { ...state, trips: state.trips.filter((t) => t.id !== action.id) };

    case 'trip/markNotified':
      return {
        ...state,
        trips: state.trips.map((t) =>
          t.id === action.id && !t.notifiedOn.includes(action.date) ? { ...t, notifiedOn: [...t.notifiedOn, action.date].slice(-10) } : t,
        ),
      };

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'demo/load': {
      const cleaned = reducer(state, { type: 'demo/remove' });
      const demo = buildDemoData();
      return {
        ...cleaned,
        items: [...cleaned.items, ...demo.items],
        transactions: capTransactions([...cleaned.transactions, ...demo.transactions].sort((a, b) => a.date.localeCompare(b.date))),
        shoppingList: [...cleaned.shoppingList, ...demo.shoppingList],
        trips: [...cleaned.trips, ...demo.trips],
        settings: { ...cleaned.settings, welcomeDismissed: true },
      };
    }

    case 'demo/remove': {
      const items = state.items.filter((i) => !i.isDemo);
      const itemIds = new Set(items.map((i) => i.id));
      const shoppingList = state.shoppingList
        .filter((s) => !s.isDemo)
        .map((s) => (s.linkedPantryItemId && !itemIds.has(s.linkedPantryItemId) ? { ...s, linkedPantryItemId: null } : s));
      const shoppingIds = new Set(shoppingList.map((s) => s.id));
      return {
        ...state,
        items,
        transactions: state.transactions.filter((t) => !t.isDemo && itemIds.has(t.itemId)),
        shoppingList,
        trips: state.trips
          .filter((t) => !t.isDemo)
          .map((t) => ({ ...t, shoppingListItems: t.shoppingListItems.filter((id) => shoppingIds.has(id)) })),
      };
    }

    case 'data/replace':
      return action.data;

    case 'data/clear':
      return createEmptyData();

    default:
      return state;
  }
}
