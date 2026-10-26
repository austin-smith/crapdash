import { createHash } from 'crypto';
import { chmod, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SNAPSHOT_LIMIT,
  SNAPSHOT_LIMIT_ENV,
  getSnapshotLimit,
  listConfigSnapshots,
  readConfigSnapshot,
} from '@/lib/config-snapshots';
import { writeConfig, writeRawConfigIfRevisionMatches } from '@/lib/db';
import { getBackupsDir, getConfigPath } from '@/lib/paths';
import { CONFIG_SNAPSHOT_REASONS, CONFIG_SNAPSHOT_RESULTS, type DashboardConfig } from '@/lib/types';
import { createTestDataDir, removeTestDataDir } from './test-data-dir';

let rootDir: string;

function configWithTitle(appTitle: string): DashboardConfig {
  return { appTitle, categories: [], services: [] };
}

function serialize(config: DashboardConfig): string {
  return JSON.stringify(config, null, 2);
}

async function seedConfig(config: DashboardConfig): Promise<string> {
  const raw = serialize(config);
  await writeFile(getConfigPath(), raw);
  return raw;
}

async function readSnapshotRaws(): Promise<string[]> {
  const snapshots = await listConfigSnapshots();
  return Promise.all(
    snapshots.map(async (snapshot) => (await readConfigSnapshot(snapshot.id))!.raw)
  );
}

describe('config snapshots', () => {
  beforeEach(async () => {
    rootDir = await createTestDataDir('snapshots');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    delete process.env[SNAPSHOT_LIMIT_ENV];
    await removeTestDataDir(rootDir);
  });

  it('saves the previous config before a write', async () => {
    const previousRaw = await seedConfig(configWithTitle('before'));

    await writeConfig(configWithTitle('after'));

    const snapshots = await listConfigSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.reason).toBe(CONFIG_SNAPSHOT_REASONS.EDIT);
    await expect(readFile(path.join(getBackupsDir(), `${snapshots[0]?.id}.json`), 'utf-8')).resolves.toBe(previousRaw);
    await expect(readFile(getConfigPath(), 'utf-8')).resolves.toBe(serialize(configWithTitle('after')));
  });

  it('records the reason for the write in the snapshot', async () => {
    await seedConfig(configWithTitle('before'));

    await writeConfig(configWithTitle('after'), CONFIG_SNAPSHOT_REASONS.IMPORT);

    const [snapshot] = await listConfigSnapshots();
    expect(snapshot?.id).toMatch(/^config-000001-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-import$/);
    expect(snapshot?.reason).toBe(CONFIG_SNAPSHOT_REASONS.IMPORT);
  });

  it('skips the snapshot when the content is unchanged', async () => {
    const config = configWithTitle('same');
    await seedConfig(config);

    await writeConfig(config);

    await expect(listConfigSnapshots()).resolves.toEqual([]);
  });

  it('skips the snapshot when there is no existing config', async () => {
    await writeConfig(configWithTitle('first'));

    await expect(listConfigSnapshots()).resolves.toEqual([]);
  });

  it('does not duplicate a snapshot that already holds the current config', async () => {
    await seedConfig(configWithTitle('a'));
    await writeConfig(configWithTitle('b'));
    // Simulate a write that failed after its snapshot was taken
    await seedConfig(configWithTitle('a'));

    await writeConfig(configWithTitle('c'));

    await expect(readSnapshotRaws()).resolves.toEqual([serialize(configWithTitle('a'))]);
  });

  it('prunes snapshots beyond the retention limit, keeping the newest', async () => {
    process.env[SNAPSHOT_LIMIT_ENV] = '3';
    await seedConfig(configWithTitle('v0'));

    for (let version = 1; version <= 5; version += 1) {
      await writeConfig(configWithTitle(`v${version}`));
    }

    await expect(readSnapshotRaws()).resolves.toEqual([
      serialize(configWithTitle('v4')),
      serialize(configWithTitle('v3')),
      serialize(configWithTitle('v2')),
    ]);
  });

  it('keeps snapshots unique and ordered when writes share a timestamp', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-11T14:02:12.345Z'));
    await seedConfig(configWithTitle('v0'));

    await writeConfig(configWithTitle('v1'));
    await writeConfig(configWithTitle('v2'));
    await writeConfig(configWithTitle('v3'));

    const snapshots = await listConfigSnapshots();
    expect(new Set(snapshots.map((snapshot) => snapshot.id)).size).toBe(3);
    await expect(readSnapshotRaws()).resolves.toEqual([
      serialize(configWithTitle('v2')),
      serialize(configWithTitle('v1')),
      serialize(configWithTitle('v0')),
    ]);
  });

  it('keeps creating snapshots when the newest snapshot cannot be read', async () => {
    await seedConfig(configWithTitle('v0'));
    await writeConfig(configWithTitle('v1'));
    const [unreadable] = await listConfigSnapshots();
    await chmod(path.join(getBackupsDir(), `${unreadable!.id}.json`), 0o000);

    await writeConfig(configWithTitle('v2'));

    const snapshots = await listConfigSnapshots();
    expect(snapshots).toHaveLength(2);
    await expect(readConfigSnapshot(snapshots[0]!.id)).resolves.toMatchObject({
      raw: serialize(configWithTitle('v1')),
    });
  });

  it('ignores directories named like snapshots', async () => {
    await mkdir(path.join(getBackupsDir(), 'config-999999-2026-10-11T14-02-12-345Z-edit.json'), { recursive: true });
    await seedConfig(configWithTitle('v0'));

    await writeConfig(configWithTitle('v1'));
    await writeConfig(configWithTitle('v2'));

    await expect(readSnapshotRaws()).resolves.toEqual([
      serialize(configWithTitle('v1')),
      serialize(configWithTitle('v0')),
    ]);
  });

  it('orders snapshots by write order when the clock moves backwards', async () => {
    const clock = vi.spyOn(Date, 'now');
    await seedConfig(configWithTitle('v0'));

    clock.mockReturnValue(Date.parse('2099-01-01T00:00:00.000Z'));
    await writeConfig(configWithTitle('v1'));
    clock.mockReturnValue(Date.parse('2026-10-11T14:02:12.345Z'));
    await writeConfig(configWithTitle('v2'));
    await writeConfig(configWithTitle('v3'));

    const snapshots = await listConfigSnapshots();
    // Timestamps record the clock as it was; order follows the writes
    expect(snapshots.map((snapshot) => snapshot.createdAt)).toEqual([
      '2026-10-11T14:02:12.345Z',
      '2026-10-11T14:02:12.345Z',
      '2099-01-01T00:00:00.000Z',
    ]);
    await expect(readSnapshotRaws()).resolves.toEqual([
      serialize(configWithTitle('v2')),
      serialize(configWithTitle('v1')),
      serialize(configWithTitle('v0')),
    ]);
  });

  it('keeps the newest snapshots when the clock moves backwards', async () => {
    process.env[SNAPSHOT_LIMIT_ENV] = '2';
    const clock = vi.spyOn(Date, 'now');
    await seedConfig(configWithTitle('v0'));

    clock.mockReturnValue(Date.parse('2099-01-01T00:00:00.000Z'));
    await writeConfig(configWithTitle('v1'));
    await writeConfig(configWithTitle('v2'));
    clock.mockReturnValue(Date.parse('2026-10-11T14:02:12.345Z'));
    await writeConfig(configWithTitle('v3'));
    await writeConfig(configWithTitle('v4'));

    await expect(readSnapshotRaws()).resolves.toEqual([
      serialize(configWithTitle('v3')),
      serialize(configWithTitle('v2')),
    ]);
  });

  it('creates no snapshots when the limit is 0 and keeps existing ones', async () => {
    await seedConfig(configWithTitle('v0'));
    await writeConfig(configWithTitle('v1'));

    process.env[SNAPSHOT_LIMIT_ENV] = '0';
    await writeConfig(configWithTitle('v2'));

    await expect(readSnapshotRaws()).resolves.toEqual([serialize(configWithTitle('v0'))]);
  });

  it('falls back to the default limit for invalid values', () => {
    process.env[SNAPSHOT_LIMIT_ENV] = 'lots';
    expect(getSnapshotLimit()).toBe(DEFAULT_SNAPSHOT_LIMIT);

    process.env[SNAPSHOT_LIMIT_ENV] = '5';
    expect(getSnapshotLimit()).toBe(5);
  });

  it('still writes the config when snapshotting fails', async () => {
    await seedConfig(configWithTitle('before'));
    // A file where the backups directory should be makes snapshot creation fail
    await writeFile(getBackupsDir(), 'not a directory');

    await writeConfig(configWithTitle('after'));

    await expect(readFile(getConfigPath(), 'utf-8')).resolves.toBe(serialize(configWithTitle('after')));
    expect(console.error).toHaveBeenCalledWith('Error creating config snapshot:', expect.anything());
  });

  it('snapshots revision-checked writes and skips rejected ones', async () => {
    const previousRaw = await seedConfig(configWithTitle('before'));
    const revision = createHash('sha256').update(previousRaw).digest('hex');

    await expect(
      writeRawConfigIfRevisionMatches(serialize(configWithTitle('stale')), 'stale-revision', CONFIG_SNAPSHOT_REASONS.EDITOR)
    ).resolves.toBeNull();
    await expect(listConfigSnapshots()).resolves.toEqual([]);

    await expect(
      writeRawConfigIfRevisionMatches(serialize(configWithTitle('after')), revision, CONFIG_SNAPSHOT_REASONS.EDITOR)
    ).resolves.toBe(CONFIG_SNAPSHOT_RESULTS.SAVED);

    const snapshots = await listConfigSnapshots();
    expect(snapshots.map((snapshot) => snapshot.reason)).toEqual([CONFIG_SNAPSHOT_REASONS.EDITOR]);
    await expect(readSnapshotRaws()).resolves.toEqual([previousRaw]);
  });

  it('ignores unrelated files and rejects ids outside the naming scheme', async () => {
    await mkdir(getBackupsDir(), { recursive: true });
    await writeFile(path.join(getBackupsDir(), 'notes.json'), '{}');
    await writeFile(path.join(getBackupsDir(), 'config-2026-10-11T14-02-12-345Z-unknown.json'), '{}');

    await expect(listConfigSnapshots()).resolves.toEqual([]);
    await expect(readConfigSnapshot('../config')).resolves.toBeNull();
    await expect(readConfigSnapshot('notes')).resolves.toBeNull();
  });
});
