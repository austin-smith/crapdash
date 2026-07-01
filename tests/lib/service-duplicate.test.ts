import { describe, expect, it } from 'vitest';
import { createServiceDuplicateDraft } from '@/lib/service-duplicate';
import { ICON_TYPES, type Service } from '@/lib/types';

const baseService: Service = {
  id: 'grafana',
  name: 'Grafana',
  description: 'Dashboards',
  url: 'https://grafana.example.com',
  categoryId: 'infra',
  icon: { type: ICON_TYPES.ICON, value: 'ChartNoAxesColumn' },
  active: true,
};

describe('service duplicate helpers', () => {
  it('creates a create-mode draft with a unique copy name', () => {
    const draft = createServiceDuplicateDraft(baseService, [baseService]);

    expect(draft).toEqual({
      name: 'Grafana (Copy)',
      description: 'Dashboards',
      url: 'https://grafana.example.com',
      categoryId: 'infra',
      icon: { type: ICON_TYPES.ICON, value: 'ChartNoAxesColumn' },
      active: true,
    });
  });

  it('increments the copy name when either the name or slug already exists', () => {
    const draft = createServiceDuplicateDraft(baseService, [
      baseService,
      { ...baseService, id: 'grafana-copy', name: 'Grafana Backup' },
      { ...baseService, id: 'grafana-copy-2', name: 'Grafana (Copy 2)' },
    ]);

    expect(draft.name).toBe('Grafana (Copy 3)');
  });

  it('preserves image icon references for the create action to copy under the new service id', () => {
    const draft = createServiceDuplicateDraft({
      ...baseService,
      icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
    }, [baseService]);

    expect(draft.icon).toEqual({ type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' });
  });
});
