'use client';

import { useSyncExternalStore } from 'react';

function getIsMac() {
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

function getServerSnapshot() {
  return false;
}

function subscribe() {
  // Platform doesn't change, so no-op
  return () => {};
}

/**
 * Detects if the user is on macOS/iOS.
 * Uses useSyncExternalStore for proper SSR hydration.
 */
export function useIsMac() {
  return useSyncExternalStore(subscribe, getIsMac, getServerSnapshot);
}

/**
 * Returns the appropriate modifier key symbol for the current platform.
 * ⌘ on Mac, Ctrl on Windows/Linux.
 */
export function useModifierKey() {
  const isMac = useIsMac();
  return isMac ? '⌘' : 'Ctrl';
}
