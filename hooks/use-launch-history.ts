'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  EMPTY_LAUNCH_HISTORY,
  LAUNCH_HISTORY_STORAGE_KEY,
  parseLaunchHistory,
  recordLaunch,
  type LaunchHistory,
} from '@/lib/launch-history';

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedHistory: LaunchHistory = EMPTY_LAUNCH_HISTORY;

// Storage can be unavailable (e.g. blocked by privacy settings); ranking just falls back to config order
function readStoredHistory(): string | null {
  try {
    return localStorage.getItem(LAUNCH_HISTORY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): LaunchHistory {
  const raw = readStoredHistory();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedHistory = parseLaunchHistory(raw);
  }
  return cachedHistory;
}

function getServerSnapshot(): LaunchHistory {
  return EMPTY_LAUNCH_HISTORY;
}

function notifyListeners() {
  for (const listener of listeners) listener();
}

function handleStorage(event: StorageEvent) {
  if (event.key === null || event.key === LAUNCH_HISTORY_STORAGE_KEY) {
    notifyListeners();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    // Keep rankings in sync with launches from other tabs
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

/** Per-browser record of which services get opened, kept only in localStorage. */
export function useLaunchHistory() {
  const launchHistory = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const recordServiceLaunch = useCallback((serviceId: string) => {
    try {
      const next = recordLaunch(getSnapshot(), serviceId, Date.now());
      localStorage.setItem(LAUNCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      return;
    }
    notifyListeners();
  }, []);

  return { launchHistory, recordServiceLaunch };
}
