import { describe, expect, it } from 'vitest';
import { diffConfigs, formatConfigChangeSummary } from '@/lib/config-diff';
import { ICON_TYPES, WIDGET_TYPES, type DashboardConfig, type Service, type Widget } from '@/lib/types';

function service(id: string, overrides: Partial<Service> = {}): Service {
  return {
    id,
    name: id,
    description: `${id} service`,
    url: `https://${id}.example.com`,
    categoryId: 'infra',
    active: true,
    ...overrides,
  };
}

const baseConfig: DashboardConfig = {
  appTitle: 'Home',
  categories: [
    { id: 'infra', name: 'Infrastructure' },
    { id: 'media', name: 'Media' },
  ],
  services: [service('grafana'), service('plex', { categoryId: 'media' })],
};

describe('diffConfigs', () => {
  it('reports no changes for equivalent configs', () => {
    const copy = JSON.parse(JSON.stringify(baseConfig)) as DashboardConfig;
    const summary = diffConfigs(baseConfig, copy);

    expect(formatConfigChangeSummary(summary)).toEqual([]);
  });

  it('counts added, removed, and edited items by id', () => {
    const target: DashboardConfig = {
      ...baseConfig,
      categories: [{ id: 'infra', name: 'Infra' }],
      services: [
        service('grafana', { url: 'https://grafana.lan' }),
        service('prometheus'),
        service('loki'),
      ],
    };

    const summary = diffConfigs(baseConfig, target);

    expect(summary.services).toEqual({ added: 2, removed: 1, changed: 1 });
    expect(summary.categories).toEqual({ added: 0, removed: 1, changed: 1 });
    expect(formatConfigChangeSummary(summary)).toEqual([
      '+2 services',
      '−1 service',
      '1 service edited',
      '−1 category',
      '1 category edited',
    ]);
  });

  it('counts widget changes and widget-only reordering', () => {
    const clock: Widget = { id: 'clock', type: WIDGET_TYPES.CLOCK, enabled: true };
    const weather: Widget = {
      id: 'weather',
      type: WIDGET_TYPES.WEATHER,
      enabled: true,
      location: { name: 'Oslo', latitude: 59.91, longitude: 10.75 },
      units: 'metric',
    };
    const current: DashboardConfig = { ...baseConfig, widgets: [clock, weather] };

    expect(formatConfigChangeSummary(diffConfigs(current, { ...baseConfig, widgets: [weather, clock] }))).toEqual([
      'reordered',
    ]);
    expect(
      formatConfigChangeSummary(diffConfigs(current, {
        ...baseConfig,
        widgets: [{ ...clock, enabled: false }, { id: 'utc', type: WIDGET_TYPES.CLOCK, enabled: true }],
      }))
    ).toEqual(['+1 widget', '\u22121 widget', '1 widget edited']);
    expect(formatConfigChangeSummary(diffConfigs(baseConfig, { ...baseConfig, widgets: [] }))).toEqual([]);
  });

  it('detects header and ordering changes', () => {
    const target: DashboardConfig = {
      ...baseConfig,
      appLogo: { type: ICON_TYPES.IMAGE, value: 'icons/app-logo.png' },
      categories: [...baseConfig.categories].reverse(),
    };

    const summary = diffConfigs(baseConfig, target);

    expect(summary.appSettingsChanged).toBe(true);
    expect(summary.reordered).toBe(true);
    expect(formatConfigChangeSummary(summary)).toEqual(['header changed', 'reordered']);
  });

  it('does not treat additions or removals alone as reordering', () => {
    const target: DashboardConfig = {
      ...baseConfig,
      services: [service('new'), ...baseConfig.services.slice(1)],
    };

    expect(diffConfigs(baseConfig, target).reordered).toBe(false);
  });
});
