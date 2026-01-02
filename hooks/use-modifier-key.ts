'use client';

import { useMemo } from 'react';

function detectIsMac(): boolean {
  if (typeof navigator === 'undefined') return false;

  // Prefer UA hints when available (Chromium userAgentData)
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const uaData = nav.userAgentData;
  if (uaData?.platform) {
    return /mac|ios|ipad|iphone|ipod/i.test(uaData.platform);
  }

  const platform = navigator.platform || '';
  const ua = navigator.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform) || /Mac|iPhone|iPad|iPod/i.test(ua);
}

function getModifierKey(isMac: boolean): string {
  return isMac ? '⌘' : 'Ctrl';
}

/**
 * Returns the platform-appropriate modifier symbol (⌘ or Ctrl) on the client.
 * Falls back to Ctrl on server render or unknown platforms.
 */
export function useModifierKey(): string {
  return useMemo(() => getModifierKey(detectIsMac()), []);
}
