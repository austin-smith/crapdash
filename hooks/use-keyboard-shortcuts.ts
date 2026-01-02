'use client';

import { useEffect } from 'react';

type Shortcut = {
  key: string;
  mod?: boolean;
  handler: () => void;
};

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      for (const { key, mod, handler } of shortcuts) {
        if (mod && !(e.metaKey || e.ctrlKey)) continue;
        if (e.key.toLowerCase() !== key.toLowerCase()) continue;
        e.preventDefault();
        handler();
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
