'use client';

import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

// One shared timer for every clock, aligned to the start of each second.
function scheduleTick() {
  timer = setTimeout(() => {
    listeners.forEach((listener) => listener());
    scheduleTick();
  }, 1000 - (Date.now() % 1000));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) scheduleTick();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
}

const getServerSnapshot = () => null;

/**
 * Current time in ms, floored to `granularityMs` so components only re-render when the
 * displayed value changes. Returns null during SSR and hydration to avoid mismatches.
 */
export function useNow(granularityMs = 1000): number | null {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / granularityMs) * granularityMs,
    getServerSnapshot
  );
}
