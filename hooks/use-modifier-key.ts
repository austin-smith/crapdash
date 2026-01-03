'use client';

import { usePlatformDefault } from '@/components/providers/platform-provider';
import { MODIFIER_CMD, type ModifierPlatform } from '@/lib/platform';

function getModifierLabel(platform: ModifierPlatform): string {
  return platform === MODIFIER_CMD ? '⌘' : 'Ctrl';
}

/**
 * Returns the platform-appropriate modifier symbol (⌘ or Ctrl) without hydration flicker.
 * Seeds from the server-provided platform value; no client revalidation to avoid post-hydration flips.
 */
export function useModifierKey(): string {
  const platform = usePlatformDefault();
  return getModifierLabel(platform);
}
