import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../state/store';
import { ItemFormSheet } from './pantry/ItemForm';
import { StockSheet, type StockKind } from './pantry/StockSheet';
import { ExpirySheet } from './pantry/ExpirySheet';
import { ShoppingFormSheet } from './shopping/ShoppingForm';
import { TripFormSheet } from './market/TripForm';

type SheetState =
  | { kind: 'none' }
  | { kind: 'item'; itemId?: string; onSaved?: (id: string) => void }
  | { kind: 'stock'; itemId: string; mode: StockKind }
  | { kind: 'expiry'; itemId: string }
  | { kind: 'shopping'; entryId?: string; fromItemId?: string }
  | { kind: 'trip'; tripId?: string };

interface SheetsApi {
  openItemForm: (itemId?: string, onSaved?: (id: string) => void) => void;
  openStock: (itemId: string, mode: StockKind) => void;
  openExpiry: (itemId: string) => void;
  openShoppingForm: (opts?: { entryId?: string; fromItemId?: string }) => void;
  openTripForm: (tripId?: string) => void;
}

const SheetsContext = createContext<SheetsApi | null>(null);

/** One place that owns every form sheet, so any screen can open them with a single call. */
export function AppSheetsProvider({ children }: { children: ReactNode }) {
  const { data } = useStore();
  const [state, setState] = useState<SheetState>({ kind: 'none' });
  // Remember the last sheet so it can animate/close without its content vanishing first.
  const close = useCallback(() => setState({ kind: 'none' }), []);

  const api = useMemo<SheetsApi>(
    () => ({
      openItemForm: (itemId, onSaved) => setState({ kind: 'item', itemId, onSaved }),
      openStock: (itemId, mode) => setState({ kind: 'stock', itemId, mode }),
      openExpiry: (itemId) => setState({ kind: 'expiry', itemId }),
      openShoppingForm: (opts) => setState({ kind: 'shopping', ...opts }),
      openTripForm: (tripId) => setState({ kind: 'trip', tripId }),
    }),
    [],
  );

  const item = 'itemId' in state && state.itemId ? data.items.find((i) => i.id === state.itemId) : undefined;
  const entry = state.kind === 'shopping' && state.entryId ? data.shoppingList.find((s) => s.id === state.entryId) : undefined;
  const trip = state.kind === 'trip' && state.tripId ? data.trips.find((t) => t.id === state.tripId) : undefined;

  return (
    <SheetsContext.Provider value={api}>
      {children}
      <ItemFormSheet open={state.kind === 'item'} onClose={close} item={state.kind === 'item' ? item : undefined} onSaved={state.kind === 'item' ? state.onSaved : undefined} />
      <StockSheet open={state.kind === 'stock' && Boolean(item)} onClose={close} item={item} initialKind={state.kind === 'stock' ? state.mode : 'consumption'} />
      <ExpirySheet open={state.kind === 'expiry' && Boolean(item)} onClose={close} item={item} />
      <ShoppingFormSheet open={state.kind === 'shopping'} onClose={close} entry={entry} fromItemId={state.kind === 'shopping' ? state.fromItemId : undefined} />
      <TripFormSheet open={state.kind === 'trip'} onClose={close} trip={trip} />
    </SheetsContext.Provider>
  );
}

export function useSheets(): SheetsApi {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error('useSheets must be used inside AppSheetsProvider');
  return ctx;
}
