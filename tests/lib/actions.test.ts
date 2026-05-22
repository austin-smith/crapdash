import { chmod, readFile, stat, writeFile } from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupFetchedServiceIcon, createService, updateService } from '@/lib/actions';
import { getConfigPath, getDataDir, getIconsDir } from '@/lib/paths';
import { ICON_TYPES, type DashboardConfig } from '@/lib/types';
import { createTestDataDir, removeTestDataDir } from './test-data-dir';

let rootDir: string;

async function writeConfig(config: DashboardConfig): Promise<void> {
  await writeFile(getConfigPath(), JSON.stringify(config, null, 2));
}

async function writeIcon(filename: string, content: string): Promise<void> {
  await writeFile(path.join(getIconsDir(), filename), content);
}

async function fileExists(filename: string): Promise<boolean> {
  return stat(path.join(getIconsDir(), filename))
    .then(() => true)
    .catch(() => false);
}

describe('service icon actions', () => {
  beforeEach(async () => {
    rootDir = await createTestDataDir('actions');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await chmod(getDataDir(), 0o755).catch(() => {});
    await removeTestDataDir(rootDir);
  });

  it('refuses to clean up persisted service icon paths', async () => {
    await writeIcon('grafana.png', 'persisted icon');
    const formData = new FormData();
    formData.append('iconPath', 'icons/grafana.png');

    const result = await cleanupFetchedServiceIcon(formData);

    expect(result.success).toBe(false);
    await expect(readFile(path.join(getIconsDir(), 'grafana.png'), 'utf-8')).resolves.toBe('persisted icon');
  });

  it('promotes a provisional icon when creating a service', async () => {
    await writeConfig({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [],
    });
    await writeIcon('__tmp-favicon-preview.png', 'fetched icon');

    const result = await createService({
      id: 'grafana',
      name: 'Grafana',
      description: 'Dashboards',
      url: 'https://grafana.example.com',
      categoryId: 'infra',
      icon: { type: ICON_TYPES.IMAGE, value: 'icons/__tmp-favicon-preview.png' },
      active: true,
      fetchFavicon: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.icon).toEqual({ type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' });
    await expect(readFile(path.join(getIconsDir(), 'grafana.png'), 'utf-8')).resolves.toBe('fetched icon');

    const savedConfig = JSON.parse(await readFile(getConfigPath(), 'utf-8')) as DashboardConfig;
    expect(savedConfig.services[0]?.icon).toEqual({ type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' });
  });

  it('restores previous icon files when update config persistence fails after promotion', async () => {
    await writeConfig({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.svg' },
        active: true,
      }],
    });
    await writeIcon('grafana.svg', 'old icon');
    await writeIcon('__tmp-favicon-preview.ico', 'new icon');
    await chmod(getDataDir(), 0o555);

    const result = await updateService('grafana', {
      name: 'Grafana',
      description: 'Dashboards',
      url: 'https://grafana.example.com',
      categoryId: 'infra',
      icon: { type: ICON_TYPES.IMAGE, value: 'icons/__tmp-favicon-preview.ico' },
      active: true,
    });

    expect(result.success).toBe(false);
    expect(await fileExists('grafana.ico')).toBe(false);
    await expect(readFile(path.join(getIconsDir(), 'grafana.svg'), 'utf-8')).resolves.toBe('old icon');

    await chmod(getDataDir(), 0o755);
    const savedConfig = JSON.parse(await readFile(getConfigPath(), 'utf-8')) as DashboardConfig;
    expect(savedConfig.services[0]?.icon).toEqual({ type: ICON_TYPES.IMAGE, value: 'icons/grafana.svg' });
  });
});
