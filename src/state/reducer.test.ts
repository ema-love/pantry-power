import { describe, expect, it } from 'vitest';
import { reducer, type PantryItemInput } from './reducer';
import { createEmptyData } from '../lib/sanitize';
import { restockableEntries } from './selectors';
import type { AppData } from '../types';

const at = '2026-11-19T10:00:00.000Z';
const rice: PantryItemInput = {
  name: 'Rice', categoryId: 'grains', quantity: 10, unit: 'kg', minimumStock: 3,
  expiryDate: null, purchaseDate: null, storageLocation: '', image: null, notes: '',
};

function withRice(): AppData {
  return reducer(createEmptyData(), { type: 'item/add', id: 'rice', input: rice, at });
}
const item = (s: AppData) => s.items.find((i) => i.id === 'rice')!;

describe('inventory', () => {
  it('adds an item with an opening transaction', () => {
    const s = withRice();
    expect(item(s).quantity).toBe(10);
    expect(s.transactions).toHaveLength(1);
    expect(s.transactions[0]).toMatchObject({ transactionType: 'addition', delta: 10, balanceAfter: 10 });
  });

  it('records an adjustment when quantity is edited', () => {
    const s = reducer(withRice(), { type: 'item/update', id: 'rice', input: { ...rice, quantity: 7, name: 'Ofada rice' }, at });
    expect(item(s)).toMatchObject({ quantity: 7, name: 'Ofada rice' });
    expect(s.transactions.at(-1)).toMatchObject({ transactionType: 'adjustment', delta: -3 });
  });

  it('deletes and restores an item', () => {
    const s0 = withRice();
    const s1 = reducer(s0, { type: 'item/delete', id: 'rice' });
    expect(s1.items).toHaveLength(0);
    expect(s1.transactions).toHaveLength(0);
    const s2 = reducer(s1, { type: 'item/restore', item: item(s0), transactions: s0.transactions, shoppingLinks: [] });
    expect(item(s2).quantity).toBe(10);
    expect(s2.transactions).toHaveLength(1);
  });
});

describe('stock changes', () => {
  it('uses stock: 10 kg − 2 kg = 8 kg', () => {
    const s = reducer(withRice(), { type: 'stock/change', txId: 't1', itemId: 'rice', kind: 'consumption', amount: 2, notes: '', purchaseDate: null, at });
    expect(item(s).quantity).toBe(8);
    expect(s.transactions.at(-1)).toMatchObject({ id: 't1', transactionType: 'consumption', quantity: 2, delta: -2, balanceAfter: 8 });
  });

  it('never goes below zero', () => {
    const s = reducer(withRice(), { type: 'stock/change', txId: 't1', itemId: 'rice', kind: 'consumption', amount: 25, notes: '', purchaseDate: null, at });
    expect(item(s).quantity).toBe(0);
    expect(s.transactions.at(-1)).toMatchObject({ delta: -10 });
  });

  it('ignores zero or negative amounts', () => {
    const s0 = withRice();
    expect(reducer(s0, { type: 'stock/change', txId: 't', itemId: 'rice', kind: 'addition', amount: -5, notes: '', purchaseDate: null, at })).toBe(s0);
    expect(reducer(s0, { type: 'stock/change', txId: 't', itemId: 'rice', kind: 'addition', amount: 0, notes: '', purchaseDate: null, at })).toBe(s0);
  });

  it('adds stock, records purchase date, and handles decimals cleanly', () => {
    const s = reducer(withRice(), { type: 'stock/change', txId: 't', itemId: 'rice', kind: 'addition', amount: 0.1, notes: '', purchaseDate: '2026-11-18', at });
    const s2 = reducer(s, { type: 'stock/change', txId: 't2', itemId: 'rice', kind: 'addition', amount: 0.2, notes: '', purchaseDate: null, at });
    expect(item(s2).quantity).toBe(10.3);
    expect(item(s2).purchaseDate).toBe('2026-11-18');
  });

  it('undoes a stock change', () => {
    const s = reducer(withRice(), { type: 'stock/change', txId: 't1', itemId: 'rice', kind: 'consumption', amount: 4, notes: '', purchaseDate: null, at });
    const undone = reducer(s, { type: 'stock/undo', txId: 't1' });
    expect(item(undone).quantity).toBe(10);
    expect(undone.transactions.find((t) => t.id === 't1')).toBeUndefined();
  });
});

describe('shopping list', () => {
  const addEntry = (s: AppData, extra: Partial<{ unit: string; linked: string | null }> = {}) =>
    reducer(s, {
      type: 'shopping/add',
      at,
      items: [{ id: 'e1', name: 'Rice', categoryId: 'grains', quantity: 5, unit: extra.unit ?? 'kg', notes: '', linkedPantryItemId: extra.linked === undefined ? 'rice' : extra.linked }],
    });

  it('toggles, restocks linked items once, and clears completed', () => {
    let s = addEntry(withRice());
    s = reducer(s, { type: 'shopping/toggle', id: 'e1', at });
    expect(s.shoppingList[0].isCompleted).toBe(true);
    expect(restockableEntries(s)).toHaveLength(1);
    s = reducer(s, { type: 'shopping/restock', ids: ['e1'], at });
    expect(item(s).quantity).toBe(15);
    expect(restockableEntries(s)).toHaveLength(0);
    // A second restock does nothing.
    s = reducer(s, { type: 'shopping/restock', ids: ['e1'], at });
    expect(item(s).quantity).toBe(15);
    s = reducer(s, { type: 'shopping/clearCompleted' });
    expect(s.shoppingList).toHaveLength(0);
  });

  it('does not restock when units differ', () => {
    let s = addEntry(withRice(), { unit: 'bag' });
    s = reducer(s, { type: 'shopping/toggle', id: 'e1', at });
    expect(restockableEntries(s)).toHaveLength(0);
    s = reducer(s, { type: 'shopping/restock', ids: ['e1'], at });
    expect(item(s).quantity).toBe(10);
  });

  it('unlinks entries when their pantry item is deleted', () => {
    let s = addEntry(withRice());
    s = reducer(s, { type: 'item/delete', id: 'rice' });
    expect(s.shoppingList[0].linkedPantryItemId).toBeNull();
  });
});

describe('market trips', () => {
  it('creates, completes with a snapshot, and survives list clean-up', () => {
    let s = reducer(withRice(), {
      type: 'shopping/add', at,
      items: [{ id: 'e1', name: 'Oil', categoryId: 'oils', quantity: 5, unit: 'litre', notes: '', linkedPantryItemId: null }],
    });
    s = reducer(s, { type: 'trip/add', id: 'trip', at, input: { title: 'Saturday', plannedDate: '2026-11-21', reminderEnabled: true, notes: '', shoppingListItems: ['e1'] } });
    s = reducer(s, { type: 'shopping/toggle', id: 'e1', at });
    s = reducer(s, { type: 'trip/complete', id: 'trip', at });
    s = reducer(s, { type: 'shopping/clearCompleted' });
    const trip = s.trips[0];
    expect(trip.status).toBe('completed');
    expect(trip.shoppingListItems).toEqual([]);
    expect(trip.itemsSnapshot).toEqual([{ name: 'Oil', quantity: 5, unit: 'litre', isCompleted: true }]);
  });
});

describe('demo data', () => {
  it('loads and removes demo data without touching real items', () => {
    let s = reducer(withRice(), { type: 'demo/load' });
    expect(s.items.length).toBeGreaterThan(15);
    expect(s.items.some((i) => i.isDemo)).toBe(true);
    s = reducer(s, { type: 'demo/remove' });
    expect(s.items.map((i) => i.id)).toEqual(['rice']);
    expect(s.shoppingList).toHaveLength(0);
    expect(s.trips).toHaveLength(0);
    expect(s.transactions.every((t) => t.itemId === 'rice')).toBe(true);
  });
});
