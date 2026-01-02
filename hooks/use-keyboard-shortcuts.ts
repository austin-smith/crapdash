'use client';

import { useEffect, useRef } from 'react';

type Shortcut = {
  key: string;
  mod?: boolean;
  handler: () => void;
};

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const shortcutsRef = useRef(shortcuts);

  // Keep ref in sync with latest shortcuts
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Attach listener once; read latest shortcuts from ref
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      for (const { key, mod, handler } of shortcutsRef.current) {
        if (mod && !(e.metaKey || e.ctrlKey)) continue;
        if (e.key.toLowerCase() !== key.toLowerCase()) continue;
        e.preventDefault();
        handler();
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
