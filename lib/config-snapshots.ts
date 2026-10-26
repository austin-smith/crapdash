import { randomUUID } from 'crypto';
import { promises as fs, type Dirent } from 'fs';
import path from 'path';
import { getBackupsDir } from './paths';
import {
  CONFIG_SNAPSHOT_REASONS,
  type ConfigSnapshot,
  type ConfigSnapshotInfo,
  type ConfigSnapshotReason,
} from './types';

export const SNAPSHOT_LIMIT_ENV = 'CRAPDASH_SNAPSHOT_LIMIT';
export const DEFAULT_SNAPSHOT_LIMIT = 20;

const SNAPSHOT_EXTENSION = '.json';
// Writes within this window of the newest snapshot are treated as simultaneous and ordered after it.
const SNAPSHOT_ORDERING_WINDOW_MS = 1_000;
const SNAPSHOT_REASONS = Object.values(CONFIG_SNAPSHOT_REASONS);
// e.g. config-2026-10-11T14-02-12-345Z-import
const SNAPSHOT_ID_PATTERN = new RegExp(
  `^config-(\\d{4}-\\d{2}-\\d{2})T(\\d{2})-(\\d{2})-(\\d{2})-(\\d{3})Z-(${SNAPSHOT_REASONS.join('|')})$`
);

function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

export function getSnapshotLimit(): number {
  const value = process.env[SNAPSHOT_LIMIT_ENV]?.trim();
  if (!value) return DEFAULT_SNAPSHOT_LIMIT;

  if (!/^\d+$/.test(value)) {
    console.warn(`Ignoring invalid ${SNAPSHOT_LIMIT_ENV} value "${value}"; using ${DEFAULT_SNAPSHOT_LIMIT}.`);
    return DEFAULT_SNAPSHOT_LIMIT;
  }

  return Number(value);
}

function getSnapshotId(createdAt: number, reason: ConfigSnapshotReason): string {
  const timestamp = new Date(createdAt).toISOString().replace(/[:.]/g, '-');
  return `config-${timestamp}-${reason}`;
}

function getSnapshotPath(id: string): string {
  return path.join(getBackupsDir(), `${id}${SNAPSHOT_EXTENSION}`);
}

export function parseConfigSnapshotId(id: string): ConfigSnapshotInfo | null {
  const match = SNAPSHOT_ID_PATTERN.exec(id);
  if (!match) return null;

  const [, date, hours, minutes, seconds, millis, reason] = match;
  const createdAt = new Date(`${date}T${hours}:${minutes}:${seconds}.${millis}Z`);
  if (Number.isNaN(createdAt.getTime())) return null;

  return {
    id,
    createdAt: createdAt.toISOString(),
    reason: reason as ConfigSnapshotReason,
  };
}

function compareNewestFirst(a: ConfigSnapshotInfo, b: ConfigSnapshotInfo): number {
  return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
}

/** Lists snapshots newest first. Entries that aren't files named like snapshots are ignored. */
export async function listConfigSnapshots(): Promise<ConfigSnapshotInfo[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(getBackupsDir(), { withFileTypes: true });
  } catch (error) {
    if (isMissingFileError(error)) return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(SNAPSHOT_EXTENSION))
    .map((entry) => parseConfigSnapshotId(entry.name.slice(0, -SNAPSHOT_EXTENSION.length)))
    .filter((info): info is ConfigSnapshotInfo => info !== null)
    .sort(compareNewestFirst);
}

/** Returns null when the id is malformed or the snapshot no longer exists. */
export async function readConfigSnapshot(id: string): Promise<ConfigSnapshot | null> {
  const info = parseConfigSnapshotId(id);
  if (!info) return null;

  try {
    const raw = await fs.readFile(getSnapshotPath(id), 'utf-8');
    return { ...info, raw };
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

async function writeSnapshotFile(id: string, raw: string): Promise<void> {
  const snapshotPath = getSnapshotPath(id);
  const tempPath = path.join(path.dirname(snapshotPath), `.${id}.tmp-${randomUUID()}`);

  try {
    await fs.writeFile(tempPath, raw, 'utf-8');
    await fs.rename(tempPath, snapshotPath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
}

async function pruneConfigSnapshots(snapshots: ConfigSnapshotInfo[], limit: number): Promise<void> {
  await Promise.all(
    snapshots.slice(limit).map(async (snapshot) => {
      await fs.unlink(getSnapshotPath(snapshot.id)).catch((error) => {
        if (!isMissingFileError(error)) throw error;
      });
    })
  );
}

function isFutureDated(snapshot: ConfigSnapshotInfo, now: number): boolean {
  return Date.parse(snapshot.createdAt) > now + SNAPSHOT_ORDERING_WINDOW_MS;
}

/** Orders snapshots for retention: future-dated files (clock jumps, hand-copied backups) are pruned first. */
function rankForRetention(snapshots: ConfigSnapshotInfo[], now: number): ConfigSnapshotInfo[] {
  return [
    ...snapshots.filter((snapshot) => !isFutureDated(snapshot, now)),
    ...snapshots.filter((snapshot) => isFutureDated(snapshot, now)),
  ];
}

async function isSnapshotContent(id: string, raw: string): Promise<boolean> {
  try {
    return (await readConfigSnapshot(id))?.raw === raw;
  } catch (error) {
    // An unreadable snapshot must not stop new ones from being created.
    console.warn(`Could not read config snapshot "${id}":`, error);
    return false;
  }
}

/**
 * Saves the config that is about to be replaced and prunes snapshots beyond the
 * retention limit. Callers must hold the config lock.
 */
export async function createConfigSnapshot(
  previousRaw: string,
  nextRaw: string,
  reason: ConfigSnapshotReason
): Promise<ConfigSnapshotInfo | null> {
  const limit = getSnapshotLimit();
  if (limit === 0 || previousRaw === nextRaw) return null;

  await fs.mkdir(getBackupsDir(), { recursive: true });

  const now = Date.now();
  const existing = await listConfigSnapshots();
  const ranked = rankForRetention(existing, now);
  // Ignore future-dated files so they can't skew new timestamps.
  const latest = ranked.find((snapshot) => !isFutureDated(snapshot, now));

  // The latest snapshot already holds this content, e.g. when the write after it failed.
  if (latest && (await isSnapshotContent(latest.id, previousRaw))) {
    await pruneConfigSnapshots(ranked, limit);
    return null;
  }

  // Keep ids unique and ordered even when writes land in the same millisecond.
  const latestTime = latest ? Date.parse(latest.createdAt) : Number.NEGATIVE_INFINITY;
  const id = getSnapshotId(Math.max(now, latestTime + 1), reason);

  await writeSnapshotFile(id, previousRaw);

  const created = parseConfigSnapshotId(id)!;
  // Always keep the snapshot for this write, even if it lands just past the ordering window.
  await pruneConfigSnapshots([created, ...ranked], limit);

  return created;
}
