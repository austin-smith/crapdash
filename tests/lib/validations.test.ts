import { describe, expect, it } from 'vitest';
import { ICON_TYPES } from '@/lib/types';
import { dashboardConfigImportSchema } from '@/lib/validations';

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
