'use client';

import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from 'react';
import {
  APPEARANCES,
  DEFAULT_APPEARANCE,
  RANDOM_APPEARANCE,
  getRandomAppearance,
  type Appearance,
  type AppearanceSetting,
} from '@/lib/appearance-config';

interface AppearanceContextValue {
  appearance: Appearance;
  appearanceSetting: AppearanceSetting;
  setAppearance: (appearance: AppearanceSetting) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

interface AppearanceProviderProps {
  children: ReactNode;
  appearance: AppearanceSetting;
  onAppearanceChange: (appearance: AppearanceSetting) => void;
}

export function AppearanceProvider({ children, appearance, onAppearanceChange }: AppearanceProviderProps) {
  const [resolvedAppearance, setResolvedAppearance] = useState<Appearance>(() =>
    appearance === RANDOM_APPEARANCE ? DEFAULT_APPEARANCE : appearance
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (appearance === RANDOM_APPEARANCE) {
      const hydratedAppearance =
        typeof document !== 'undefined'
          ? (document.documentElement.getAttribute('data-appearance') as Appearance | null)
          : null;
      const nextAppearance =
        hydratedAppearance && APPEARANCES.includes(hydratedAppearance)
          ? hydratedAppearance
          : getRandomAppearance();
      startTransition(() => setResolvedAppearance(nextAppearance));
    } else {
      startTransition(() => setResolvedAppearance(appearance));
    }
  }, [appearance]);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedAppearance === DEFAULT_APPEARANCE) {
      root.removeAttribute('data-appearance');
    } else {
      root.setAttribute('data-appearance', resolvedAppearance);
    }
  }, [resolvedAppearance]);

  return (
    <AppearanceContext.Provider
      value={{
        appearance: resolvedAppearance,
        appearanceSetting: appearance,
        setAppearance: onAppearanceChange,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    return {
      appearance: DEFAULT_APPEARANCE,
      appearanceSetting: DEFAULT_APPEARANCE,
      setAppearance: () => {},
    };
  }
  return context;
}
