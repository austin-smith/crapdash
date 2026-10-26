import { chmod, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getConfigHistory,
  getConfigSnapshot,
  importConfig,
  reorderWidgets,
  restoreConfigSnapshot,
  saveConfigJson,
} from '@/lib/actions';
import { SNAPSHOT_LIMIT_ENV, listConfigSnapshots } from '@/lib/config-snapshots';
import { writeConfig } from '@/lib/db';
import { getBackupsDir, getConfigPath } from '@/lib/paths';
import {
  CONFIG_SNAPSHOT_REASONS,
  CONFIG_SNAPSHOT_RESULTS,
  CONFIG_SNAPSHOT_STATUSES,
  ICON_TYPES,
  WIDGET_TYPES,
  type DashboardConfig,
  type Service,
} from '@/lib/types';
import { createTestDataDir, removeTestDataDir } from './test-data-dir';

let rootDir: string;

const originalConfig: DashboardConfig = {
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
};

const replacementConfig: DashboardConfig = {
  categories: [{ id: 'media', name: 'Media' }],
  services: [],
};

function serialize(config: DashboardConfig): string {
  return JSON.stringify(config, null, 2);
}

async function readSavedConfig(): Promise<DashboardConfig> {
  return JSON.parse(await readFile(getConfigPath(), 'utf-8')) as DashboardConfig;
}

async function seedHistory(): Promise<string> {
  await writeFile(getConfigPath(), serialize(originalConfig));
  await writeConfig(replacementConfig, CONFIG_SNAPSHOT_REASONS.IMPORT);

  const [snapshot] = await listConfigSnapshots();
  return snapshot!.id;
}

async function getRevision(): Promise<string> {
  const result = await getConfigHistory();
  if (!result.success) throw new Error('Failed to read history');
  return result.data.revision;
}

describe('config history actions', () => {
  beforeEach(async () => {
    rootDir = await createTestDataDir('history');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    delete process.env[SNAPSHOT_LIMIT_ENV];
    await chmod(getBackupsDir(), 0o755).catch(() => {});
    await removeTestDataDir(rootDir);
  });

  it('lists snapshots with changes relative to the current config', async () => {
    const snapshotId = await seedHistory();

    const result = await getConfigHistory();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.limit).toBe(20);
    expect(result.data.snapshots).toEqual([{
      id: snapshotId,
      createdAt: expect.any(String),
      reason: CONFIG_SNAPSHOT_REASONS.IMPORT,
      status: CONFIG_SNAPSHOT_STATUSES.VALID,
      summary: {
        categories: { added: 1, removed: 1, changed: 0 },
        services: { added: 1, removed: 0, changed: 0 },
        widgets: { added: 0, removed: 0, changed: 0 },
        appSettingsChanged: false,
        reordered: false,
      },
    }]);
  });

  it('flags snapshots that are not valid configs', async () => {
    await writeFile(getConfigPath(), '{ "categories": [], "services": [');
    await writeConfig(replacementConfig);

    const result = await getConfigHistory();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.snapshots[0]).toMatchObject({ status: CONFIG_SNAPSHOT_STATUSES.INVALID, summary: null });
  });

  it('keeps listing history when one snapshot cannot be read', async () => {
    const unreadableId = await seedHistory();
    await writeConfig({ ...replacementConfig, appTitle: 'Later' });
    await chmod(path.join(getBackupsDir(), `${unreadableId}.json`), 0o000);

    const result = await getConfigHistory();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.snapshots.map((snapshot) => snapshot.status)).toEqual([
      CONFIG_SNAPSHOT_STATUSES.VALID,
      CONFIG_SNAPSHOT_STATUSES.UNREADABLE,
    ]);
    await expect(
      restoreConfigSnapshot({ id: unreadableId, revision: result.data.revision })
    ).resolves.toMatchObject({ success: false });
  });

  it('returns snapshot content for preview', async () => {
    const snapshotId = await seedHistory();

    const result = await getConfigSnapshot(snapshotId);

    expect(result).toMatchObject({ success: true, data: { id: snapshotId, raw: serialize(originalConfig) } });
    await expect(getConfigSnapshot('../config')).resolves.toMatchObject({ success: false });
  });

  it('restores a snapshot and saves the replaced config so the restore can be undone', async () => {
    const snapshotId = await seedHistory();

    const result = await restoreConfigSnapshot({ id: snapshotId, revision: await getRevision() });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.config).toEqual(originalConfig);
    expect(result.data.snapshotResult).toBe(CONFIG_SNAPSHOT_RESULTS.SAVED);
    expect(result.data.revision).toBe(await getRevision());
    await expect(readSavedConfig()).resolves.toEqual(originalConfig);

    const [undoSnapshot] = await listConfigSnapshots();
    expect(undoSnapshot?.reason).toBe(CONFIG_SNAPSHOT_REASONS.RESTORE);

    const undo = await restoreConfigSnapshot({ id: undoSnapshot!.id, revision: await getRevision() });

    expect(undo.success).toBe(true);
    await expect(readSavedConfig()).resolves.toEqual(replacementConfig);
  });

  it('reports an unchanged config when restoring a snapshot identical to it', async () => {
    const snapshotId = await seedHistory();
    await restoreConfigSnapshot({ id: snapshotId, revision: await getRevision() });

    const result = await restoreConfigSnapshot({ id: snapshotId, revision: await getRevision() });

    expect(result).toMatchObject({ success: true, data: { snapshotResult: CONFIG_SNAPSHOT_RESULTS.UNCHANGED } });
  });

  it('reports when snapshots are disabled so the restore cannot be undone', async () => {
    const snapshotId = await seedHistory();
    process.env[SNAPSHOT_LIMIT_ENV] = '0';

    const result = await restoreConfigSnapshot({ id: snapshotId, revision: await getRevision() });

    expect(result).toMatchObject({ success: true, data: { snapshotResult: CONFIG_SNAPSHOT_RESULTS.DISABLED } });
    await expect(readSavedConfig()).resolves.toEqual(originalConfig);
    expect(await listConfigSnapshots()).toHaveLength(1);
  });

  it('reports when the replaced config could not be saved but still restores', async () => {
    const snapshotId = await seedHistory();
    await chmod(getBackupsDir(), 0o500);

    const result = await restoreConfigSnapshot({ id: snapshotId, revision: await getRevision() });

    expect(result).toMatchObject({ success: true, data: { snapshotResult: CONFIG_SNAPSHOT_RESULTS.FAILED } });
    await expect(readSavedConfig()).resolves.toEqual(originalConfig);
  });

  it('warns but restores when a snapshot references a deleted icon', async () => {
    const snapshotId = await seedHistory();

    const result = await restoreConfigSnapshot({ id: snapshotId, revision: await getRevision() });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.warnings).toEqual([{
      field: 'services.0.icon.value',
      message: 'Icon file "icons/grafana.png" was not found under data/icons.',
    }]);
  });

  it('restores snapshots larger than the import size limit', async () => {
    // Accepted configs are saved pretty-printed, so a stored copy can outgrow the 5MB upload cap.
    const services: Service[] = Array.from({ length: 9_000 }, (_, index) => ({
      id: `service-${index}`,
      name: `Service ${index}`,
      description: 'x'.repeat(500),
      url: 'https://example.com',
      categoryId: 'infra',
      active: true,
    }));
    const largeConfig: DashboardConfig = { categories: originalConfig.categories, services };
    await writeFile(getConfigPath(), serialize(largeConfig));
    expect(serialize(largeConfig).length).toBeGreaterThan(5 * 1024 * 1024);
    await writeConfig(replacementConfig);
    const [snapshot] = await listConfigSnapshots();

    const result = await restoreConfigSnapshot({ id: snapshot!.id, revision: await getRevision() });

    expect(result.success).toBe(true);
    await expect(readSavedConfig()).resolves.toEqual(largeConfig);
  });

  it('rejects a restore when the config changed since history was loaded', async () => {
    const snapshotId = await seedHistory();
    const revision = await getRevision();
    await writeConfig({ ...replacementConfig, appTitle: 'Changed elsewhere' });

    const result = await restoreConfigSnapshot({ id: snapshotId, revision });

    expect(result).toMatchObject({ success: false, errors: [{ field: 'revision' }] });
    await expect(readSavedConfig()).resolves.toMatchObject({ appTitle: 'Changed elsewhere' });
  });

  it('rejects unknown snapshot ids', async () => {
    await seedHistory();
    const revision = await getRevision();

    for (const id of ['../config', 'config-000999-2026-01-01T00-00-00-000Z-edit']) {
      const result = await restoreConfigSnapshot({ id, revision });
      expect(result).toMatchObject({ success: false, errors: [{ field: 'id', message: 'Snapshot not found' }] });
    }
    await expect(readSavedConfig()).resolves.toEqual(replacementConfig);
  });

  it('rejects snapshots that fail validation without changing the config', async () => {
    await writeFile(getConfigPath(), serialize({
      categories: [],
      services: [{ ...originalConfig.services[0]!, categoryId: 'missing' }],
    }));
    await writeConfig(replacementConfig);
    const [snapshot] = await listConfigSnapshots();

    const result = await restoreConfigSnapshot({ id: snapshot!.id, revision: await getRevision() });

    expect(result).toMatchObject({
      success: false,
      errors: [{ field: 'services.0.categoryId', message: 'Service references unknown category "missing"' }],
    });
    await expect(readSavedConfig()).resolves.toEqual(replacementConfig);
  });

  it('snapshots widget reorders and restores the previous widget order', async () => {
    const widgetConfig: DashboardConfig = {
      ...originalConfig,
      widgets: [
        { id: 'clock', type: WIDGET_TYPES.CLOCK, enabled: true },
        { id: 'utc', type: WIDGET_TYPES.CLOCK, enabled: true, timeZone: 'UTC' },
      ],
    };
    await writeFile(getConfigPath(), serialize(widgetConfig));

    await expect(reorderWidgets(['utc', 'clock'])).resolves.toMatchObject({ success: true });

    const [snapshot] = await listConfigSnapshots();
    expect(snapshot?.reason).toBe(CONFIG_SNAPSHOT_REASONS.REORDER);

    const result = await restoreConfigSnapshot({ id: snapshot!.id, revision: await getRevision() });

    expect(result.success).toBe(true);
    expect((await readSavedConfig()).widgets?.map((widget) => widget.id)).toEqual(['clock', 'utc']);
  });

  it('snapshots config imports and config editor saves', async () => {
    await writeFile(getConfigPath(), serialize(originalConfig));
    const formData = new FormData();
    formData.append('file', new File([serialize(replacementConfig)], 'config.json', { type: 'application/json' }));

    await expect(importConfig(formData)).resolves.toMatchObject({ success: true });
    await expect(
      saveConfigJson({ raw: serialize({ ...replacementConfig, appTitle: 'Forced' }), force: true })
    ).resolves.toMatchObject({ success: true });

    const snapshots = await listConfigSnapshots();
    expect(snapshots.map((snapshot) => snapshot.reason)).toEqual([
      CONFIG_SNAPSHOT_REASONS.EDITOR,
      CONFIG_SNAPSHOT_REASONS.IMPORT,
    ]);
  });
});
