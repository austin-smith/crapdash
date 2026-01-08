import { LAYOUTS, type Preferences } from '@/lib/types';
import { APPEARANCES, RANDOM_APPEARANCE, type Appearance, type AppearanceSetting } from '@/lib/appearance-config';

/**
 * Decode and validate preferences persisted in the cookie.
 * Returns an empty object on any parse/validation failure.
 */
export function parsePreferences(cookieValue: string | undefined): Partial<Preferences> {
  if (!cookieValue) return {};

  try {
    const decoded = decodeURIComponent(cookieValue);
    const parsed = JSON.parse(decoded);
    const settings: Partial<Preferences> = {};

    if (parsed.layout === LAYOUTS.ROWS || parsed.layout === LAYOUTS.COLUMNS) {
      settings.layout = parsed.layout;
    }

    if (typeof parsed.expandOnHover === 'boolean') {
      settings.expandOnHover = parsed.expandOnHover;
    }

    if (
      parsed.appearance === RANDOM_APPEARANCE ||
      APPEARANCES.includes(parsed.appearance as Appearance)
    ) {
      settings.appearance = parsed.appearance as AppearanceSetting;
    }

    return settings;
  } catch {
    return {};
  }
}
