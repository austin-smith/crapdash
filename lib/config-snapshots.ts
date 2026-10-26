import { randomUUID } from 'crypto';
import { promises as fs, type Dirent } from 'fs';
import path from 'path';
import { getBackupsDir } from './paths';
import {
  CONFIG_SNAPSHOT_REASONS,
  CONFIG_SNAPSHOT_RESULTS,
  type ConfigSnapshot,
  type ConfigSnapshotInfo,
  type ConfigSnapshotReason,
  type ConfigSnapshotResult,
} from './types';

export const SNAPSHOT_LIMIT_ENV = 'CRAPDASH_SNAPSHOT_LIMIT';
export const DEFAULT_SNAPSHOT_LIMIT = 20;

const SNAPSHOT_EXTENSION = '.json';
const SNAPSHOT_SEQUENCE_DIGITS = 6;
const SNAPSHOT_REASONS = Object.values(CONFIG_SNAPSHOT_REASONS);
// e.g. config-000042-2026-10-11T14-02-12-345Z-import
// The sequence orders snapshots by when they were written; the timestamp is only for display,
// so clock changes can't reorder history or affect which snapshots are pruned.
const SNAPSHOT_ID_PATTERN = new RegExp(
  `^config-(\\d{1,15})-(\\d{4}-\\d{2}-\\d{2})T(\\d{2})-(\\d{2})-(\\d{2})-(\\d{3})Z-(${SNAPSHOT_REASONS.join('|')})$`
);

interface SnapshotEntry extends ConfigSnapshotInfo {
  sequence: number;
}

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

function getSnapshotId(sequence: number, createdAt: number, reason: ConfigSnapshotReason): string {
  const paddedSequence = String(sequence).padStart(SNAPSHOT_SEQUENCE_DIGITS, '0');
  const timestamp = new Date(createdAt).toISOString().replace(/[:.]/g, '-');
  return `config-${paddedSequence}-${timestamp}-${reason}`;
}

function getSnapshotPath(id: string): string {
  return path.join(getBackupsDir(), `${id}${SNAPSHOT_EXTENSION}`);
}

function parseSnapshotId(id: string): SnapshotEntry | null {
  const match = SNAPSHOT_ID_PATTERN.exec(id);
  if (!match) return null;

  const [, sequence, date, hours, minutes, seconds, millis, reason] = match;
  const createdAt = new Date(`${date}T${hours}:${minutes}:${seconds}.${millis}Z`);
  if (Number.isNaN(createdAt.getTime())) return null;

  return {
    id,
    sequence: Number(sequence),
    createdAt: createdAt.toISOString(),
    reason: reason as ConfigSnapshotReason,
  };
}

function toSnapshotInfo({ id, createdAt, reason }: SnapshotEntry): ConfigSnapshotInfo {
  return { id, createdAt, reason };
}

/** Lists snapshots newest first, by write order. Entries that aren't files named like snapshots are ignored. */
async function listSnapshotEntries(): Promise<SnapshotEntry[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(getBackupsDir(), { withFileTypes: true });
  } catch (error) {
    if (isMissingFileError(error)) return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(SNAPSHOT_EXTENSION))
    .map((entry) => parseSnapshotId(entry.name.slice(0, -SNAPSHOT_EXTENSION.length)))
    .filter((snapshot): snapshot is SnapshotEntry => snapshot !== null)
    .sort((a, b) => b.sequence - a.sequence || b.id.localeCompare(a.id));
}

/** Lists snapshots newest first, by write order. */
export async function listConfigSnapshots(): Promise<ConfigSnapshotInfo[]> {
  return (await listSnapshotEntries()).map(toSnapshotInfo);
}

/** Returns null when the id is malformed or the snapshot no longer exists. */
export async function readConfigSnapshot(id: string): Promise<ConfigSnapshot | null> {
  const snapshot = parseSnapshotId(id);
  if (!snapshot) return null;

  try {
    const raw = await fs.readFile(getSnapshotPath(id), 'utf-8');
    return { ...toSnapshotInfo(snapshot), raw };
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

/** Deletes snapshots beyond the limit. Expects snapshots newest first. */
async function pruneConfigSnapshots(snapshots: SnapshotEntry[], limit: number): Promise<void> {
  await Promise.all(
    snapshots.slice(limit).map(async (snapshot) => {
      await fs.unlink(getSnapshotPath(snapshot.id)).catch((error) => {
        if (!isMissingFileError(error)) throw error;
      });
    })
  );
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
): Promise<ConfigSnapshotResult> {
  const limit = getSnapshotLimit();
  if (limit === 0) return CONFIG_SNAPSHOT_RESULTS.DISABLED;
  if (previousRaw === nextRaw) return CONFIG_SNAPSHOT_RESULTS.UNCHANGED;

  await fs.mkdir(getBackupsDir(), { recursive: true });

  const existing = await listSnapshotEntries();
  const latest = existing[0];

  // The latest snapshot already holds this content, e.g. when the write after it failed.
  if (latest && (await isSnapshotContent(latest.id, previousRaw))) {
    await pruneConfigSnapshots(existing, limit);
    return CONFIG_SNAPSHOT_RESULTS.SAVED;
  }

  // The lock serializes writes, so the next sequence is unique and always the newest.
  const id = getSnapshotId((latest?.sequence ?? 0) + 1, Date.now(), reason);
  await writeSnapshotFile(id, previousRaw);

  await pruneConfigSnapshots([parseSnapshotId(id)!, ...existing], limit);

  return CONFIG_SNAPSHOT_RESULTS.SAVED;
}
