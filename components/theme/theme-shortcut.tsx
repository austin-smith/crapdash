'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { ThemeIndicator } from './theme-indicator';
import { Theme, getNextTheme } from '../../lib/theme-config';

export function ThemeShortcut() {
  const { theme, setTheme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [displayTheme, setDisplayTheme] = useState<Theme>('light');

  const cycleTheme = useCallback(() => {
    const nextTheme = getNextTheme(theme);
    setTheme(nextTheme);
    setDisplayTheme(nextTheme);
    setVisible(true);
  }, [theme, setTheme]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        cycleTheme();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleTheme]);

  useEffect(() => {
    if (!visible) return;

    const timeout = setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [visible, displayTheme]);

  return <ThemeIndicator theme={displayTheme} visible={visible} />;
}
