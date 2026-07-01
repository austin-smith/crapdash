import { chmod, readdir, readFile, stat, writeFile } from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupFetchedServiceIcon,
  createService,
  deleteService,
  updateAppSettings,
  updateService,
  uploadAppLogo,
  uploadServiceIcon,
} from '@/lib/actions';
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

  it('copies an existing image icon when creating a service with a different id', async () => {
    await writeConfig({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
        active: true,
      }],
    });
    await writeIcon('grafana.png', 'source icon');

    const result = await createService({
      id: 'grafana-copy',
      name: 'Grafana Copy',
      description: 'Dashboards',
      url: 'https://grafana.example.com',
      categoryId: 'infra',
      icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
      active: true,
      fetchFavicon: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.icon).toEqual({ type: ICON_TYPES.IMAGE, value: 'icons/grafana-copy.png' });
    await expect(readFile(path.join(getIconsDir(), 'grafana.png'), 'utf-8')).resolves.toBe('source icon');
    await expect(readFile(path.join(getIconsDir(), 'grafana-copy.png'), 'utf-8')).resolves.toBe('source icon');

    const savedConfig = JSON.parse(await readFile(getConfigPath(), 'utf-8')) as DashboardConfig;
    expect(savedConfig.services[1]?.icon).toEqual({ type: ICON_TYPES.IMAGE, value: 'icons/grafana-copy.png' });
  });

  it('keeps duplicated image icons isolated even when the source basename matches the new id', async () => {
    await writeConfig({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana-copy.png' },
        active: true,
      }],
    });
    await writeIcon('grafana-copy.png', 'source icon');

    const result = await createService({
      id: 'grafana-copy',
      name: 'Grafana (Copy)',
      description: 'Dashboards',
      url: 'https://grafana.example.com',
      categoryId: 'infra',
      icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana-copy.png' },
      active: true,
      fetchFavicon: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.icon?.type).toBe(ICON_TYPES.IMAGE);
    expect(result.data.icon?.value).toMatch(/^icons\/grafana-copy-[a-f0-9-]+\.png$/);
    const duplicateIconFilename = path.basename(result.data.icon?.value ?? '');
    await expect(readFile(path.join(getIconsDir(), 'grafana-copy.png'), 'utf-8')).resolves.toBe('source icon');
    await expect(readFile(path.join(getIconsDir(), duplicateIconFilename), 'utf-8')).resolves.toBe('source icon');

    const savedConfig = JSON.parse(await readFile(getConfigPath(), 'utf-8')) as DashboardConfig;
    expect(savedConfig.services[0]?.icon).toEqual({ type: ICON_TYPES.IMAGE, value: 'icons/grafana-copy.png' });
    expect(savedConfig.services[1]?.icon).toEqual(result.data.icon);

    const deleteResult = await deleteService('grafana-copy');

    expect(deleteResult.success).toBe(true);
    await expect(readFile(path.join(getIconsDir(), 'grafana-copy.png'), 'utf-8')).resolves.toBe('source icon');
    expect(await fileExists(duplicateIconFilename)).toBe(false);
  });

  it('does not overwrite another service icon when the default copy destination is already referenced', async () => {
    await writeConfig({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [
        {
          id: 'grafana',
          name: 'Grafana',
          description: 'Dashboards',
          url: 'https://grafana.example.com',
          categoryId: 'infra',
          icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
          active: true,
        },
        {
          id: 'metrics',
          name: 'Metrics',
          description: 'Metrics',
          url: 'https://metrics.example.com',
          categoryId: 'infra',
          icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana-copy.png' },
          active: true,
        },
      ],
    });
    await writeIcon('grafana.png', 'source icon');
    await writeIcon('grafana-copy.png', 'reserved icon');

    const result = await createService({
      id: 'grafana-copy',
      name: 'Grafana (Copy)',
      description: 'Dashboards',
      url: 'https://grafana.example.com',
      categoryId: 'infra',
      icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
      active: true,
      fetchFavicon: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.icon?.type).toBe(ICON_TYPES.IMAGE);
    expect(result.data.icon?.value).toMatch(/^icons\/grafana-copy-[a-f0-9-]+\.png$/);
    await expect(readFile(path.join(getIconsDir(), 'grafana-copy.png'), 'utf-8')).resolves.toBe('reserved icon');
  });

  it('does not remove another referenced icon with the same basename and a different extension', async () => {
    await writeConfig({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [
        {
          id: 'grafana',
          name: 'Grafana',
          description: 'Dashboards',
          url: 'https://grafana.example.com',
          categoryId: 'infra',
          icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
          active: true,
        },
        {
          id: 'metrics',
          name: 'Metrics',
          description: 'Metrics',
          url: 'https://metrics.example.com',
          categoryId: 'infra',
          icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana-copy.svg' },
          active: true,
        },
      ],
    });
    await writeIcon('grafana.png', 'source icon');
    await writeIcon('grafana-copy.svg', 'reserved svg');

    const result = await createService({
      id: 'grafana-copy',
      name: 'Grafana (Copy)',
      description: 'Dashboards',
      url: 'https://grafana.example.com',
      categoryId: 'infra',
      icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
      active: true,
      fetchFavicon: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.icon?.type).toBe(ICON_TYPES.IMAGE);
    expect(result.data.icon?.value).toMatch(/^icons\/grafana-copy-[a-f0-9-]+\.png$/);
    await expect(readFile(path.join(getIconsDir(), 'grafana-copy.svg'), 'utf-8')).resolves.toBe('reserved svg');
  });

  it('preserves referenced same-basename icons when uploading a service icon', async () => {
    await writeConfig({
      appLogo: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.svg' },
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [],
    });
    await writeIcon('grafana.svg', 'app logo');

    const formData = new FormData();
    formData.append('serviceId', 'grafana');
    formData.append('file', new File(['service icon'], 'grafana.png', { type: 'image/png' }));

    const result = await uploadServiceIcon(formData);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatch(/^icons\/grafana-[a-f0-9-]+\.png$/);
    await expect(readFile(path.join(getIconsDir(), 'grafana.svg'), 'utf-8')).resolves.toBe('app logo');
    await expect(readFile(path.join(getIconsDir(), path.basename(result.data)), 'utf-8')).resolves.toBe('service icon');
  });

  it('uses an unreferenced uploaded service icon without copying it again on create', async () => {
    await writeConfig({
      appLogo: { type: ICON_TYPES.IMAGE, value: 'icons/app-logo.png' },
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [],
    });
    await writeIcon('app-logo.png', 'app logo');

    const formData = new FormData();
    formData.append('serviceId', 'app-logo');
    formData.append('file', new File(['service icon'], 'service.png', { type: 'image/png' }));
    const uploadResult = await uploadServiceIcon(formData);

    expect(uploadResult.success).toBe(true);
    if (!uploadResult.success) return;
    expect(uploadResult.data).toMatch(/^icons\/app-logo-[a-f0-9-]+\.png$/);

    const createResult = await createService({
      id: 'app-logo',
      name: 'App Logo',
      description: 'Service',
      url: 'https://app-logo.example.com',
      categoryId: 'infra',
      icon: { type: ICON_TYPES.IMAGE, value: uploadResult.data },
      active: true,
      fetchFavicon: false,
    });

    expect(createResult.success).toBe(true);
    if (!createResult.success) return;
    expect(createResult.data.icon).toEqual({ type: ICON_TYPES.IMAGE, value: uploadResult.data });
    const iconFiles = await readdir(getIconsDir());
    expect(iconFiles.filter((file) => /^app-logo-[a-f0-9-]+\.png$/.test(file))).toHaveLength(1);
    await expect(readFile(path.join(getIconsDir(), path.basename(uploadResult.data)), 'utf-8')).resolves.toBe('service icon');
  });

  it('preserves referenced same-basename icons when uploading an app logo', async () => {
    await writeConfig({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/app-logo.svg' },
        active: true,
      }],
    });
    await writeIcon('app-logo.svg', 'service icon');

    const formData = new FormData();
    formData.append('file', new File(['app logo'], 'logo.png', { type: 'image/png' }));

    const result = await uploadAppLogo(formData);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatch(/^icons\/app-logo-[a-f0-9-]+\.png$/);
    await expect(readFile(path.join(getIconsDir(), 'app-logo.svg'), 'utf-8')).resolves.toBe('service icon');
    await expect(readFile(path.join(getIconsDir(), path.basename(result.data)), 'utf-8')).resolves.toBe('app logo');
  });

  it('does not overwrite the app logo when the default copy destination is already referenced by it', async () => {
    await writeConfig({
      appLogo: { type: ICON_TYPES.IMAGE, value: 'icons/grafana-copy.png' },
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
        active: true,
      }],
    });
    await writeIcon('grafana.png', 'source icon');
    await writeIcon('grafana-copy.png', 'app logo');

    const result = await createService({
      id: 'grafana-copy',
      name: 'Grafana (Copy)',
      description: 'Dashboards',
      url: 'https://grafana.example.com',
      categoryId: 'infra',
      icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
      active: true,
      fetchFavicon: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.icon?.type).toBe(ICON_TYPES.IMAGE);
    expect(result.data.icon?.value).toMatch(/^icons\/grafana-copy-[a-f0-9-]+\.png$/);
    await expect(readFile(path.join(getIconsDir(), 'grafana-copy.png'), 'utf-8')).resolves.toBe('app logo');
  });

  it('creates the service without an icon when a copied image source file is missing', async () => {
    await writeConfig({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
        active: true,
      }],
    });

    const result = await createService({
      id: 'grafana-copy',
      name: 'Grafana (Copy)',
      description: 'Dashboards',
      url: 'https://grafana.example.com',
      categoryId: 'infra',
      icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
      active: true,
      fetchFavicon: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.icon).toBeUndefined();
    expect(await fileExists('grafana-copy.png')).toBe(false);

    const savedConfig = JSON.parse(await readFile(getConfigPath(), 'utf-8')) as DashboardConfig;
    expect(savedConfig.services[1]?.icon).toBeUndefined();
  });

  it('does not delete a service icon file that is still referenced by the app logo', async () => {
    await writeConfig({
      appLogo: { type: ICON_TYPES.IMAGE, value: 'icons/shared.png' },
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/shared.png' },
        active: true,
      }],
    });
    await writeIcon('shared.png', 'shared icon');

    const result = await deleteService('grafana');

    expect(result.success).toBe(true);
    await expect(readFile(path.join(getIconsDir(), 'shared.png'), 'utf-8')).resolves.toBe('shared icon');
  });

  it('does not delete an updated service icon file that is still referenced by another service', async () => {
    await writeConfig({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [
        {
          id: 'grafana',
          name: 'Grafana',
          description: 'Dashboards',
          url: 'https://grafana.example.com',
          categoryId: 'infra',
          icon: { type: ICON_TYPES.IMAGE, value: 'icons/shared.png' },
          active: true,
        },
        {
          id: 'metrics',
          name: 'Metrics',
          description: 'Metrics',
          url: 'https://metrics.example.com',
          categoryId: 'infra',
          icon: { type: ICON_TYPES.IMAGE, value: 'icons/shared.png' },
          active: true,
        },
      ],
    });
    await writeIcon('shared.png', 'shared icon');

    const result = await updateService('grafana', {
      name: 'Grafana',
      description: 'Dashboards',
      url: 'https://grafana.example.com',
      categoryId: 'infra',
      active: true,
    });

    expect(result.success).toBe(true);
    await expect(readFile(path.join(getIconsDir(), 'shared.png'), 'utf-8')).resolves.toBe('shared icon');
  });

  it('does not delete an app logo file that is still referenced by a service', async () => {
    await writeConfig({
      appLogo: { type: ICON_TYPES.IMAGE, value: 'icons/shared.png' },
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/shared.png' },
        active: true,
      }],
    });
    await writeIcon('shared.png', 'shared icon');

    const result = await updateAppSettings({ appLogo: null });

    expect(result.success).toBe(true);
    await expect(readFile(path.join(getIconsDir(), 'shared.png'), 'utf-8')).resolves.toBe('shared icon');
  });

  it('restores previous icon files when update config persistence fails after promotion', async () => {
    await writeConfig({
      categories: [{ id: 'infra', name: 'Infrastructure' }],
      services: [
        {
          id: 'grafana',
          name: 'Grafana',
          description: 'Dashboards',
          url: 'https://grafana.example.com',
          categoryId: 'infra',
          icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.svg' },
          active: true,
        },
        {
          id: 'metrics',
          name: 'Metrics',
          description: 'Metrics',
          url: 'https://metrics.example.com',
          categoryId: 'infra',
          icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
          active: true,
        },
      ],
    });
    await writeIcon('grafana.svg', 'old icon');
    await writeIcon('grafana.png', 'reserved icon');
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
    const iconFiles = await readdir(getIconsDir());
    expect(await fileExists('grafana.ico')).toBe(false);
    expect(iconFiles.filter((file) => /^grafana-[a-f0-9-]+\.ico$/.test(file))).toEqual([]);
    await expect(readFile(path.join(getIconsDir(), 'grafana.svg'), 'utf-8')).resolves.toBe('old icon');
    await expect(readFile(path.join(getIconsDir(), 'grafana.png'), 'utf-8')).resolves.toBe('reserved icon');

    await chmod(getDataDir(), 0o755);
    const savedConfig = JSON.parse(await readFile(getConfigPath(), 'utf-8')) as DashboardConfig;
    expect(savedConfig.services[0]?.icon).toEqual({ type: ICON_TYPES.IMAGE, value: 'icons/grafana.svg' });
    expect(savedConfig.services[1]?.icon).toEqual({ type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' });
  });
});
