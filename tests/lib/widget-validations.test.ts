import { describe, expect, it } from 'vitest';
import { WEATHER_UNITS, WIDGET_TYPES } from '@/lib/types';
import { dashboardConfigImportSchema, widgetSettingsSchema } from '@/lib/validations';

const weatherLocation = { name: 'Austin, Texas, United States', latitude: 30.2672, longitude: -97.7431 };

describe('widget settings validation', () => {
  it('accepts a minimal clock and fills no implicit options', () => {
    expect(widgetSettingsSchema.parse({ type: WIDGET_TYPES.CLOCK })).toEqual({ type: WIDGET_TYPES.CLOCK });
  });

  it('accepts a fully configured clock', () => {
    const settings = {
      type: WIDGET_TYPES.CLOCK,
      hourCycle: '24h',
      timeZone: 'America/New_York',
      showDate: false,
      showSeconds: true,
    };

    expect(widgetSettingsSchema.parse(settings)).toEqual(settings);
  });

  it('rejects unknown time zones', () => {
    const result = widgetSettingsSchema.safeParse({ type: WIDGET_TYPES.CLOCK, timeZone: 'Mars/Olympus_Mons' });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(['timeZone']);
  });

  it('rejects unsupported hour cycles', () => {
    expect(widgetSettingsSchema.safeParse({ type: WIDGET_TYPES.CLOCK, hourCycle: '36h' }).success).toBe(false);
  });

  it('accepts a weather widget with coordinates and units', () => {
    const settings = { type: WIDGET_TYPES.WEATHER, location: weatherLocation, units: WEATHER_UNITS.IMPERIAL };

    expect(widgetSettingsSchema.parse(settings)).toEqual(settings);
  });

  it.each([
    ['latitude', { ...weatherLocation, latitude: 91 }],
    ['longitude', { ...weatherLocation, longitude: -181 }],
    ['name', { ...weatherLocation, name: '  ' }],
  ])('rejects an invalid weather %s', (field, location) => {
    const result = widgetSettingsSchema.safeParse({ type: WIDGET_TYPES.WEATHER, location, units: WEATHER_UNITS.METRIC });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(['location', field]);
  });

  it('requires weather units', () => {
    expect(widgetSettingsSchema.safeParse({ type: WIDGET_TYPES.WEATHER, location: weatherLocation }).success).toBe(false);
  });

  it('rejects unknown widget types', () => {
    expect(widgetSettingsSchema.safeParse({ type: 'stocks' }).success).toBe(false);
  });
});

describe('dashboard config import with widgets', () => {
  const baseConfig = { categories: [], services: [] };

  it('keeps accepting configs without widgets', () => {
    const result = dashboardConfigImportSchema.parse(baseConfig);

    expect(result.widgets).toBeUndefined();
    expect(result).toEqual(baseConfig);
  });

  it('accepts widgets and defaults enabled to true', () => {
    const result = dashboardConfigImportSchema.parse({
      ...baseConfig,
      widgets: [
        { id: 'clock', type: WIDGET_TYPES.CLOCK },
        { id: 'weather', type: WIDGET_TYPES.WEATHER, location: weatherLocation, units: WEATHER_UNITS.METRIC, enabled: false },
      ],
    });

    expect(result.widgets).toEqual([
      { id: 'clock', type: WIDGET_TYPES.CLOCK, enabled: true },
      { id: 'weather', type: WIDGET_TYPES.WEATHER, location: weatherLocation, units: WEATHER_UNITS.METRIC, enabled: false },
    ]);
  });

  it('rejects duplicate widget ids', () => {
    const result = dashboardConfigImportSchema.safeParse({
      ...baseConfig,
      widgets: [
        { id: 'clock', type: WIDGET_TYPES.CLOCK },
        { id: 'clock', type: WIDGET_TYPES.CLOCK, timeZone: 'Europe/London' },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual([
      expect.objectContaining({ message: 'Duplicate widget id "clock"', path: ['widgets', 1, 'id'] }),
    ]);
  });

  it('rejects invalid widget ids and unknown widget types', () => {
    expect(dashboardConfigImportSchema.safeParse({
      ...baseConfig,
      widgets: [{ id: 'my clock', type: WIDGET_TYPES.CLOCK }],
    }).success).toBe(false);

    expect(dashboardConfigImportSchema.safeParse({
      ...baseConfig,
      widgets: [{ id: 'stocks', type: 'stocks' }],
    }).success).toBe(false);
  });

  it('still rejects unknown top-level keys', () => {
    expect(dashboardConfigImportSchema.safeParse({ ...baseConfig, widget: [] }).success).toBe(false);
  });
});
