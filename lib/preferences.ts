import { LAYOUTS, type Preferences } from '@/lib/types';
import { APPEARANCES, type Appearance } from '@/lib/appearance-config';

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

    if (APPEARANCES.includes(parsed.appearance as Appearance)) {
      settings.appearance = parsed.appearance;
    }

    return settings;
  } catch {
    return {};
  }
}
