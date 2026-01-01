'use client';

import { useState, useCallback } from 'react';
import { setCookie } from '@/lib/utils';
import {
  SETTINGS_COOKIE_NAME,
  DEFAULT_SETTINGS,
  type DashboardSettings,
} from '@/lib/types';

const STORAGE_KEY = SETTINGS_COOKIE_NAME;

interface UseSettingsOptions {
  initialSettings?: Partial<DashboardSettings>;
}

function mergeSettings(partial?: Partial<DashboardSettings>): DashboardSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
  };
}

export function useSettings({ initialSettings }: UseSettingsOptions = {}) {
  const [settings, setSettingsState] = useState<DashboardSettings>(() =>
    mergeSettings(initialSettings)
  );

  const persistSettings = useCallback((newSettings: DashboardSettings) => {
    const json = JSON.stringify(newSettings);
    localStorage.setItem(STORAGE_KEY, json);
    setCookie(SETTINGS_COOKIE_NAME, json);
  }, []);

  const updateSetting = useCallback(
    <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => {
      setSettingsState((prev) => {
        const next = { ...prev, [key]: value };
        persistSettings(next);
        return next;
      });
    },
    [persistSettings]
  );

  const updateSettings = useCallback(
    (updates: Partial<DashboardSettings>) => {
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

