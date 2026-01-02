import { LAYOUTS, type DashboardSettings } from '@/lib/types';

/**
 * Decode and validate dashboard settings persisted in the cookie.
 * Returns an empty object on any parse/validation failure.
 */
export function parseSettings(cookieValue: string | undefined): Partial<DashboardSettings> {
  if (!cookieValue) return {};

  try {
    const decoded = decodeURIComponent(cookieValue);
    const parsed = JSON.parse(decoded);
    const settings: Partial<DashboardSettings> = {};

    if (parsed.layout === LAYOUTS.ROWS || parsed.layout === LAYOUTS.COLUMNS) {
      settings.layout = parsed.layout;
    }

    if (typeof parsed.expandOnHover === 'boolean') {
      settings.expandOnHover = parsed.expandOnHover;
    }

    return settings;
  } catch {
    return {};
  }
}
