import { Sun, Moon, Monitor, type LucideIcon } from 'lucide-react';

export type Theme = 'light' | 'dark' | 'system';

export const THEMES: Theme[] = ['light', 'dark', 'system'];

export const THEME_META: Record<Theme, { icon: LucideIcon; label: string }> = {
  light: { icon: Sun, label: 'Light' },
  dark: { icon: Moon, label: 'Dark' },
  system: { icon: Monitor, label: 'System' },
};

export function getNextTheme(current: string | undefined): Theme {
  const index = THEMES.indexOf(current as Theme);
  return THEMES[(index + 1) % THEMES.length] ?? 'light';
}
