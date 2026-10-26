import { describe, expect, it } from 'vitest';
import { WEATHER_UNITS, WIDGET_TYPES } from '@/lib/types';
import { getAvailableWidgetId, getDefaultWeatherUnits, getTimeZoneLabel, isValidTimeZone } from '@/lib/widgets';

describe('widget helpers', () => {
  it('uses the widget type as the first ID and numbers later ones', () => {
    expect(getAvailableWidgetId(WIDGET_TYPES.CLOCK, [])).toBe('clock');
    expect(getAvailableWidgetId(WIDGET_TYPES.CLOCK, [{ id: 'clock' }, { id: 'weather' }])).toBe('clock-2');
    expect(getAvailableWidgetId(WIDGET_TYPES.CLOCK, [{ id: 'clock' }, { id: 'clock-2' }])).toBe('clock-3');
  });

  it('validates IANA time zones', () => {
    expect(isValidTimeZone('America/Chicago')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
  });

  it('labels time zones by city', () => {
    expect(getTimeZoneLabel('America/New_York')).toBe('New York');
    expect(getTimeZoneLabel('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    expect(getTimeZoneLabel('UTC')).toBe('UTC');
  });

  it('suggests weather units from the locale region', () => {
    expect(getDefaultWeatherUnits('en-US')).toBe(WEATHER_UNITS.IMPERIAL);
    expect(getDefaultWeatherUnits('en')).toBe(WEATHER_UNITS.IMPERIAL);
    expect(getDefaultWeatherUnits('en-GB')).toBe(WEATHER_UNITS.METRIC);
    expect(getDefaultWeatherUnits('de-DE')).toBe(WEATHER_UNITS.METRIC);
    expect(getDefaultWeatherUnits('not a locale')).toBe(WEATHER_UNITS.METRIC);
  });
});
