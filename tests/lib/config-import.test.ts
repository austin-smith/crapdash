import { writeFile } from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collectConfigImportWarnings } from '@/lib/config-import';
import { getIconsDir } from '@/lib/paths';
import { ICON_TYPES, type DashboardConfig } from '@/lib/types';
import { createTestDataDir, removeTestDataDir } from './test-data-dir';

let rootDir: string;

describe('collectConfigImportWarnings', () => {
  beforeEach(async () => {
    rootDir = await createTestDataDir('config-import');
  });

  afterEach(async () => {
    await removeTestDataDir(rootDir);
  });

  it('warns for missing referenced image files', async () => {
    const config: DashboardConfig = {
      categories: [],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.png' },
        active: true,
      }],
    };

    await expect(collectConfigImportWarnings(config)).resolves.toEqual([
      {
        field: 'services.0.icon.value',
        message: 'Icon file "icons/grafana.png" was not found under data/icons.',
      },
    ]);
  });

  it('warns for unsupported image extensions', async () => {
    await writeFile(path.join(getIconsDir(), 'grafana.bmp'), 'bitmap');
    const config: DashboardConfig = {
      categories: [],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.bmp' },
        active: true,
      }],
    };

    await expect(collectConfigImportWarnings(config)).resolves.toEqual([
      {
        field: 'services.0.icon.value',
        message: 'Icon "icons/grafana.bmp" uses an unsupported extension and may not be served correctly.',
      },
    ]);
  });

  it('does not warn for existing supported image references', async () => {
    await writeFile(path.join(getIconsDir(), 'app-logo.png'), 'logo');
    await writeFile(path.join(getIconsDir(), 'grafana.svg'), '<svg />');
    const config: DashboardConfig = {
      appLogo: { type: ICON_TYPES.IMAGE, value: 'icons/app-logo.png' },
      categories: [],
      services: [{
        id: 'grafana',
        name: 'Grafana',
        description: 'Dashboards',
        url: 'https://grafana.example.com',
        categoryId: 'infra',
        icon: { type: ICON_TYPES.IMAGE, value: 'icons/grafana.svg' },
        active: true,
      }],
    };

    await expect(collectConfigImportWarnings(config)).resolves.toEqual([]);
  });
});
