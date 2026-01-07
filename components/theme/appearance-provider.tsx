'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { type Appearance, DEFAULT_APPEARANCE } from '@/lib/appearance-config';

interface AppearanceContextValue {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

interface AppearanceProviderProps {
  children: ReactNode;
  appearance: Appearance;
  onAppearanceChange: (appearance: Appearance) => void;
}

export function AppearanceProvider({ children, appearance, onAppearanceChange }: AppearanceProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    if (appearance === DEFAULT_APPEARANCE) {
      root.removeAttribute('data-appearance');
    } else {
      root.setAttribute('data-appearance', appearance);
    }
  }, [appearance]);

  return (
    <AppearanceContext.Provider value={{ appearance, setAppearance: onAppearanceChange }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    return { appearance: DEFAULT_APPEARANCE, setAppearance: () => {} };
  }
  return context;
}
