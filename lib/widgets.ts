import { WEATHER_UNITS, type WeatherUnits, type Widget, type WidgetType } from './types';

/**
 * Returns true when the runtime's Intl implementation recognizes the IANA time zone.
 */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Short, human-friendly label for an IANA time zone, e.g. "America/New_York" -> "New York".
 */
export function getTimeZoneLabel(timeZone: string): string {
  const city = timeZone.split('/').pop() ?? timeZone;
  return city.replace(/_/g, ' ');
}

/**
 * Picks a readable, unique widget ID based on its type: "clock", then "clock-2", "clock-3", ...
 */
export function getAvailableWidgetId(type: WidgetType, widgets: Pick<Widget, 'id'>[]): string {
  const existingIds = new Set(widgets.map((widget) => widget.id));
  if (!existingIds.has(type)) return type;

  let suffix = 2;
  while (existingIds.has(`${type}-${suffix}`)) {
    suffix += 1;
  }
  return `${type}-${suffix}`;
}

// Regions that conventionally use Fahrenheit for weather.
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH']);

/**
 * Suggests weather units from a BCP 47 locale (e.g. "en-US" -> imperial).
 */
export function getDefaultWeatherUnits(locale: string): WeatherUnits {
  try {
    const region = new Intl.Locale(locale).maximize().region;
    return region && IMPERIAL_REGIONS.has(region) ? WEATHER_UNITS.IMPERIAL : WEATHER_UNITS.METRIC;
  } catch {
    return WEATHER_UNITS.METRIC;
  }
}
