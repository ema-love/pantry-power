import { useCallback, useMemo } from 'react';
import type { PantryItem, ShoppingListItem } from '../types';
import { useStore } from './store';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/Confirm';
import { createId } from '../lib/id';
import { formatQty } from '../lib/format';
import { getStockStatus, suggestedRestockQuantity } from '../lib/stock';
import { restockableEntries } from './selectors';
import type { PantryItemInput, ShoppingItemInput } from './reducer';

/** User-level operations: each one updates state and gives clear feedback, with undo where it helps. */
export function useActions() {
  const { data, dispatch } = useStore();
  const toast = useToast();
  const confirm = useConfirm();

  const now = () => new Date().toISOString();
  const qty = useCallback((n: number, unit: string) => formatQty(n, unit, data.units), [data.units]);

  const findOpenEntryFor = useCallback(
    (itemId: string) => data.shoppingList.find((s) => s.linkedPantryItemId === itemId && !s.isCompleted),
    [data.shoppingList],
  );

  const addItemToList = useCallback(
    (item: PantryItem, overrides?: Partial<ShoppingItemInput>) => {
      if (findOpenEntryFor(item.id)) {
        toast({ message: `${item.name} is already on your shopping list`, tone: 'info' });
        return;
      }
      dispatch({
        type: 'shopping/add',
        at: now(),
        items: [
          {
            id: createId('shop'),
            name: item.name,
            categoryId: item.categoryId,
            quantity: suggestedRestockQuantity(item),
            unit: item.unit,
            notes: '',
            linkedPantryItemId: item.id,
            ...overrides,
          },
        ],
      });
      toast({ message: `${item.name} added to your shopping list` });
    },
    [dispatch, findOpenEntryFor, toast],
  );

  return useMemo(
    () => ({
      addItem(input: PantryItemInput) {
        const id = createId('item');
        dispatch({ type: 'item/add', id, input, at: now() });
        toast({ message: `${input.name} added to your pantry` });
        return id;
      },

      updateItem(id: string, input: PantryItemInput) {
        dispatch({ type: 'item/update', id, input, at: now() });
        toast({ message: 'Changes saved' });
      },

      async deleteItem(item: PantryItem, opts: { reason?: 'discard' } = {}): Promise<boolean> {
        const ok = await confirm({
          title: opts.reason === 'discard' ? `Throw away ${item.name}?` : `Delete ${item.name}?`,
          message:
            opts.reason === 'discard'
              ? `This removes ${item.name} and its history from your pantry. Do this once you've thrown it away.`
              : `This removes ${item.name} and its stock history from your pantry.`,
          confirmLabel: opts.reason === 'discard' ? 'Remove item' : 'Delete item',
          danger: true,
        });
        if (!ok) return false;
        const transactions = data.transactions.filter((t) => t.itemId === item.id);
        const shoppingLinks = data.shoppingList.filter((s) => s.linkedPantryItemId === item.id).map((s) => s.id);
        dispatch({ type: 'item/delete', id: item.id });
        toast({
          message: `${item.name} removed`,
          action: { label: 'Undo', onClick: () => dispatch({ type: 'item/restore', item, transactions, shoppingLinks }) },
        });
        return true;
      },

      changeStock(item: PantryItem, kind: 'addition' | 'consumption', amount: number, notes = '', purchaseDate: string | null = null) {
        const txId = createId('tx');
        dispatch({ type: 'stock/change', txId, itemId: item.id, kind, amount, notes, purchaseDate, at: now() });
        const newQty = Math.max(0, Math.round((item.quantity + (kind === 'addition' ? amount : -amount)) * 100) / 100);
        toast({
          message: kind === 'addition' ? `Added ${qty(amount, item.unit)} of ${item.name}` : `Used ${qty(amount, item.unit)} of ${item.name}`,
          action: { label: 'Undo', onClick: () => dispatch({ type: 'stock/undo', txId }) },
        });
        if (kind === 'consumption') {
          const before = getStockStatus(item);
          const after = getStockStatus({ ...item, quantity: newQty });
          if (after !== 'in' && after !== before && !findOpenEntryFor(item.id)) {
            toast({
              message: after === 'out' ? `${item.name} is now out of stock` : `${item.name} is running low`,
              tone: 'info',
              action: { label: 'Add to list', onClick: () => addItemToList({ ...item, quantity: newQty }) },
            });
          }
        }
      },

      addItemToList,

      addManyToList(items: PantryItem[]) {
        const fresh = items.filter((i) => !findOpenEntryFor(i.id));
        if (fresh.length === 0) {
          toast({ message: 'Those items are already on your shopping list', tone: 'info' });
          return;
        }
        dispatch({
          type: 'shopping/add',
          at: now(),
          items: fresh.map((item) => ({
            id: createId('shop'),
            name: item.name,
            categoryId: item.categoryId,
            quantity: suggestedRestockQuantity(item),
            unit: item.unit,
            notes: '',
            linkedPantryItemId: item.id,
          })),
        });
        toast({ message: `${fresh.length} item${fresh.length === 1 ? '' : 's'} added to your shopping list` });
      },

      addShoppingEntry(input: ShoppingItemInput) {
        dispatch({ type: 'shopping/add', at: now(), items: [{ ...input, id: createId('shop') }] });
        toast({ message: `${input.name} added to your shopping list` });
      },

      updateShoppingEntry(id: string, input: ShoppingItemInput) {
        dispatch({ type: 'shopping/update', id, input });
        toast({ message: 'Shopping item updated' });
      },

      toggleShoppingEntry(entry: ShoppingListItem) {
        dispatch({ type: 'shopping/toggle', id: entry.id, at: now() });
      },

      removeShoppingEntry(entry: ShoppingListItem) {
        const tripIds = data.trips.filter((t) => t.shoppingListItems.includes(entry.id)).map((t) => t.id);
        dispatch({ type: 'shopping/remove', id: entry.id });
        toast({
          message: `${entry.name} removed from the list`,
          action: {
            label: 'Undo',
            onClick: () => dispatch({ type: 'shopping/restore', entry, tripIds }),
          },
        });
      },

      async clearCompleted(count: number) {
        const ok = await confirm({
          title: 'Clear bought items?',
          message: `This removes ${count} ticked item${count === 1 ? '' : 's'} from your shopping list.`,
          confirmLabel: 'Clear items',
        });
        if (ok) {
          dispatch({ type: 'shopping/clearCompleted' });
          toast({ message: 'Bought items cleared' });
        }
      },

      restockFromShopping(ids?: string[]) {
        const entries = restockableEntries(data, ids);
        if (entries.length === 0) return 0;
        dispatch({ type: 'shopping/restock', ids: entries.map((e) => e.id), at: now() });
        toast({ message: `Pantry updated with ${entries.length} bought item${entries.length === 1 ? '' : 's'}` });
        return entries.length;
      },
    }),
    [addItemToList, confirm, data, dispatch, findOpenEntryFor, qty, toast],
  );
}
