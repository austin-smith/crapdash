import { describe, expect, it } from 'vitest';
import { ICON_TYPES, SEARCH_ENGINES } from '@/lib/types';
import { dashboardConfigImportSchema, searchSettingsSchema } from '@/lib/validations';

describe('dashboard config import validation', () => {
  it('defaults imported services to active', () => {
    const result = dashboardConfigImportSchema.parse({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
      }],
    });

    expect(result.services[0]?.active).toBe(true);
  });

  it('rejects duplicate category IDs', () => {
    const result = dashboardConfigImportSchema.safeParse({
      categories: [
        { id: 'infra', name: 'Infrastructure' },
        { id: 'infra', name: 'Duplicate' },
      ],
      services: [],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        message: 'Duplicate category id "infra"',
        path: ['categories', 1, 'id'],
      }),
    ]));
  });

  it('rejects duplicate service IDs', () => {
    const result = dashboardConfigImportSchema.safeParse({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [
        {
          id: 'grafana',
          name: 'Grafana',
          description: 'Dashboards',
          url: 'https://grafana.example.com',
          categoryId: 'infra',
          active: true,
        },
        {
          id: 'grafana',
          name: 'Grafana duplicate',
          description: 'Dashboards',
          url: 'https://grafana-duplicate.example.com',
          categoryId: 'infra',
          active: true,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        message: 'Duplicate service id "grafana"',
        path: ['services', 1, 'id'],
      }),
    ]));
  });

  it('rejects services that reference unknown categories', () => {
    const result = dashboardConfigImportSchema.safeParse({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'missing',
        active: true,
      }],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        message: 'Service references unknown category "missing"',
        path: ['services', 0, 'categoryId'],
      }),
    ]));
  });

  it('rejects image icons for categories', () => {
    const result = dashboardConfigImportSchema.safeParse({
      categories: [{
        id: 'infra',
        name: 'Infrastructure',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/infra.png' },
      }],
      services: [],
    });

    expect(result.success).toBe(false);
  });

  it('normalizes Lucide icon names case-insensitively', () => {
    const result = dashboardConfigImportSchema.parse({
      categories: [{
        id: 'infra',
        name: 'Infrastructure',
        icon: { type: ICON_TYPES.ICON, value: 'settings' },
      }],
      services: [],
    });

    expect(result.categories[0]?.icon).toEqual({ type: ICON_TYPES.ICON, value: 'Settings' });
  });
});

describe('search settings validation', () => {
  it('accepts built-in engines and trims custom URLs', () => {
    expect(searchSettingsSchema.parse({ engine: SEARCH_ENGINES.GOOGLE })).toEqual({
      engine: SEARCH_ENGINES.GOOGLE,
    });
    expect(searchSettingsSchema.parse({
      engine: SEARCH_ENGINES.CUSTOM,
      customUrl: '  http://searx.local/search?q=%s  ',
    })).toEqual({
      engine: SEARCH_ENGINES.CUSTOM,
      customUrl: 'http://searx.local/search?q=%s',
    });
  });

  it('requires a URL for the custom engine', () => {
    const result = searchSettingsSchema.safeParse({ engine: SEARCH_ENGINES.CUSTOM });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual([
      expect.objectContaining({ message: 'Custom search URL is required', path: ['customUrl'] }),
    ]);
  });

  it.each([
    ['javascript:alert(%s)', 'Must be a valid http or https URL'],
    ['ftp://files.local/%s', 'Must be a valid http or https URL'],
    ['not a url %s', 'Must be a valid http or https URL'],
    ['https://searx.local/search', 'Must include %s where the search query goes'],
  ])('rejects the custom URL %j', (customUrl, message) => {
    const result = searchSettingsSchema.safeParse({ engine: SEARCH_ENGINES.CUSTOM, customUrl });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual([
      expect.objectContaining({ message, path: ['customUrl'] }),
    ]);
  });

  it('rejects unknown engines and keys', () => {
    expect(searchSettingsSchema.safeParse({ engine: 'yahoo' }).success).toBe(false);
    expect(searchSettingsSchema.safeParse({ engine: SEARCH_ENGINES.BING, extra: true }).success).toBe(false);
  });

  it('accepts configs with and without search settings', () => {
    expect(dashboardConfigImportSchema.parse({ categories: [], services: [] }).search).toBeUndefined();
    expect(dashboardConfigImportSchema.parse({
      search: { engine: SEARCH_ENGINES.NONE },
      categories: [],
      services: [],
    }).search).toEqual({ engine: SEARCH_ENGINES.NONE });
  });

  it('rejects invalid search settings in imported configs', () => {
    const result = dashboardConfigImportSchema.safeParse({
      search: { engine: SEARCH_ENGINES.CUSTOM, customUrl: 'https://searx.local/' },
      categories: [],
      services: [],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual([
      expect.objectContaining({ path: ['search', 'customUrl'] }),
    ]);
  });
});
