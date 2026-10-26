import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_TITLE } from '@/lib/types';
import { formatRelativeTime, getAppTitle, getConfigExportFilename, slugify } from '@/lib/utils';

describe('utility helpers', () => {
  it('formats times relative to now', () => {
    const now = new Date('2026-10-25T20:43:00.000Z');
    const ago = (ms: number) => formatRelativeTime(new Date(now.getTime() - ms), now, 'en-US');

    expect(ago(20_000)).toBe('Just now');
    expect(ago(18 * 60_000)).toBe('18 minutes ago');
    expect(ago(5 * 60 * 60_000)).toBe('5 hours ago');
    expect(ago(36 * 60 * 60_000)).toBe('Yesterday');
    expect(ago(3 * 24 * 60 * 60_000)).toBe('3 days ago');
    expect(ago(9 * 24 * 60 * 60_000)).toBe('Last week');
    expect(ago(400 * 24 * 60 * 60_000)).toBe('Last year');
    expect(ago(-2 * 60 * 60_000)).toBe('In 2 hours');
  });

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
