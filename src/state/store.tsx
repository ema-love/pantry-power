import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { AppData } from '../types';
import { localStorageAdapter, type StorageAdapter } from '../lib/storage';
import { reducer, type Action } from './reducer';

interface StoreValue {
  data: AppData;
  dispatch: (action: Action) => void;
  /** Problem reported while loading or saving, shown as a banner. */
  storageNotice: string | null;
  dismissStorageNotice: () => void;
  isFirstRun: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children, adapter = localStorageAdapter }: { children: ReactNode; adapter?: StorageAdapter }) {
  const initial = useMemo(() => adapter.load(), [adapter]);
  const [data, dispatch] = useReducer(reducer, initial.data);
  const [storageNotice, setStorageNotice] = useState<string | null>(() => {
    if (initial.status === 'recovered') return initial.message;
    if (initial.status === 'ok' && initial.dropped > 0) {
      return `${initial.dropped} damaged record${initial.dropped === 1 ? ' was' : 's were'} skipped while loading your pantry.`;
    }
    return null;
  });
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Nothing changed yet on first render — avoid writing an empty pantry over storage that failed to load.
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      if (initial.status !== 'fresh') return;
    }
    const result = adapter.save(data);
    if (!result.ok) {
      setStorageNotice(
        result.reason === 'quota'
          ? 'Your device storage is full, so the latest change could not be saved. Try removing some item photos, then export a backup.'
          : 'Changes could not be saved on this device. Check that your browser allows site storage.',
      );
    }
  }, [data, adapter, initial.status]);

  // Keep several open tabs in step with each other.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'pantry-power:data' || e.newValue === null) return;
      const reloaded = adapter.load();
      if (reloaded.status === 'ok') dispatch({ type: 'data/replace', data: reloaded.data });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [adapter]);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      dispatch,
      storageNotice,
      dismissStorageNotice: () => setStorageNotice(null),
      isFirstRun: initial.status === 'fresh',
    }),
    [data, storageNotice, initial.status],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
