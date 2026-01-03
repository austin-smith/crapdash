'use client';

import { useState, useCallback } from 'react';
import { setCookie } from '@/lib/utils';
import {
  PREFERENCES_COOKIE_NAME,
  DEFAULT_PREFERENCES,
  type Preferences,
} from '@/lib/types';

const STORAGE_KEY = PREFERENCES_COOKIE_NAME;

interface UsePreferencesOptions {
  initialSettings?: Partial<Preferences>;
}

function mergeSettings(partial?: Partial<Preferences>): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...partial,
  };
}

export function usePreferences({ initialSettings }: UsePreferencesOptions = {}) {
  const [settings, setSettingsState] = useState<Preferences>(() =>
    mergeSettings(initialSettings)
  );

  const persistSettings = useCallback((newSettings: Preferences) => {
    const json = JSON.stringify(newSettings);
    localStorage.setItem(STORAGE_KEY, json);
    // Encode cookie value so it stays cookie-safe across browsers/parsers
    setCookie(PREFERENCES_COOKIE_NAME, encodeURIComponent(json));
  }, []);

  const updateSetting = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setSettingsState((prev) => {
        const next = { ...prev, [key]: value };
        persistSettings(next);
        return next;
      });
    },
    [persistSettings]
  );

  const updateSettings = useCallback(
    (updates: Partial<Preferences>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...updates };
        persistSettings(next);
        return next;
      });
    },
    [persistSettings]
  );

  return { settings, updateSetting, updateSettings };
}
