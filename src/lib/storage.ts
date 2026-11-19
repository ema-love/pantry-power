import type { AppData } from '../types';
import { createEmptyData, sanitizeData } from './sanitize';

/**
 * Persistence boundary. V1 stores everything on this device (localStorage).
 * A cloud-backed adapter can implement the same interface later without touching the UI.
 */
export interface StorageAdapter {
  load(): LoadResult;
  save(data: AppData): SaveResult;
  clear(): void;
}

export type LoadResult =
  | { status: 'fresh'; data: AppData }
  | { status: 'ok'; data: AppData; dropped: number }
  | { status: 'recovered'; data: AppData; message: string };

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

export const STORAGE_KEY = 'pantry-power:data';

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export const localStorageAdapter: StorageAdapter = {
  load() {
    const storage = getStorage();
    if (!storage) {
      return { status: 'recovered', data: createEmptyData(), message: 'This browser is blocking storage, so changes will not be saved after you close the page.' };
    }
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { status: 'fresh', data: createEmptyData() };
    try {
      const { data, dropped } = sanitizeData(JSON.parse(raw));
      return { status: 'ok', data, dropped };
    } catch {
      // Keep the unreadable copy so nothing is silently lost.
      try {
        storage.setItem(`${STORAGE_KEY}:unreadable:${Date.now()}`, raw);
      } catch {
        /* ignore */
      }
      return {
        status: 'recovered',
        data: createEmptyData(),
        message: 'Your saved pantry data could not be read, so we started fresh. A copy of the old data was kept on this device.',
      };
    }
  },
  save(data) {
    const storage = getStorage();
    if (!storage) return { ok: false, reason: 'unavailable' };
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
      return { ok: true };
    } catch (err) {
      const quota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
      return { ok: false, reason: quota ? 'quota' : 'unavailable' };
    }
  },
  clear() {
    getStorage()?.removeItem(STORAGE_KEY);
  },
};

export interface BackupFile {
  app: 'pantry-power';
  exportedAt: string;
  data: AppData;
}

export function createBackup(data: AppData): BackupFile {
  return { app: 'pantry-power', exportedAt: new Date().toISOString(), data };
}

/** Parse a backup file's text. Accepts a full backup wrapper or bare AppData. */
export function parseBackup(text: string): { data: AppData; dropped: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This file is not a valid Pantry Power backup.');
  }
  const payload =
    typeof parsed === 'object' && parsed !== null && 'data' in parsed && (parsed as { app?: unknown }).app === 'pantry-power'
      ? (parsed as { data: unknown }).data
      : parsed;
  if (typeof payload !== 'object' || payload === null || !('items' in payload)) {
    throw new Error('This file is not a valid Pantry Power backup.');
  }
  return sanitizeData(payload);
}

export function downloadBackup(data: AppData, filenameDate: string): void {
  const blob = new Blob([JSON.stringify(createBackup(data), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pantry-power-backup-${filenameDate}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
