import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_TITLE } from '@/lib/types';
import { getAppTitle, getConfigExportFilename, slugify } from '@/lib/utils';

describe('utility helpers', () => {
  it('slugifies service and category names', () => {
    expect(slugify(' Grafana Cloud / Prod! ')).toBe('grafana-cloud-prod');
    expect(slugify('Already---Slugged')).toBe('already-slugged');
  });

  it('falls back to the default app title for blank values', () => {
    expect(getAppTitle('My Dashboard')).toBe('My Dashboard');
    expect(getAppTitle('   ')).toBe(DEFAULT_APP_TITLE);
    expect(getAppTitle()).toBe(DEFAULT_APP_TITLE);
  });

  it('formats config export filenames with the ISO calendar date', () => {
    const date = new Date('2026-05-03T23:59:59.000Z');

    expect(getConfigExportFilename(date)).toBe('crapdash-config-2026-05-03.json');
  });
});
