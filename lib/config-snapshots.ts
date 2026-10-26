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

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Retention: the newest snapshots, then one per hour for a day and one per day for a month.
const RECENT_SNAPSHOT_COUNT = 20;
const HOURLY_RETENTION_MS = DAY_MS;
const DAILY_RETENTION_MS = 30 * DAY_MS;

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

/** Returns the hour or day a snapshot represents, or null once it's past retention. */
function getRetentionPeriod(snapshot: SnapshotEntry, now: number): string | null {
  const createdAt = Date.parse(snapshot.createdAt);
  const age = now - createdAt;

  if (age <= HOURLY_RETENTION_MS) return `hour:${Math.floor(createdAt / HOUR_MS)}`;
  if (age <= DAILY_RETENTION_MS) return `day:${Math.floor(createdAt / DAY_MS)}`;
  return null;
}

/**
 * Keeps the newest snapshots, plus the earliest snapshot of each hour in the last day and
 * each day in the last month: the config as it was before that period's changes.
 * Expects snapshots newest first.
 */
function getExpiredSnapshots(snapshots: SnapshotEntry[], now: number): SnapshotEntry[] {
  const keep = new Set(snapshots.slice(0, RECENT_SNAPSHOT_COUNT).map((snapshot) => snapshot.id));
  const keptPeriods = new Set<string>();

  for (const snapshot of [...snapshots].reverse()) {
    const period = getRetentionPeriod(snapshot, now);
    if (period && !keptPeriods.has(period)) {
      keptPeriods.add(period);
      keep.add(snapshot.id);
    }
  }

  return snapshots.filter((snapshot) => !keep.has(snapshot.id));
}

/** Deletes snapshots that fall outside retention. Expects snapshots newest first. */
async function pruneConfigSnapshots(snapshots: SnapshotEntry[], now: number): Promise<void> {
  await Promise.all(
    getExpiredSnapshots(snapshots, now).map(async (snapshot) => {
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
 * Saves the config that is about to be replaced and prunes snapshots outside retention.
 * Callers must hold the config lock.
 */
export async function createConfigSnapshot(
  previousRaw: string,
  nextRaw: string,
  reason: ConfigSnapshotReason
): Promise<ConfigSnapshotResult> {
  if (previousRaw === nextRaw) return CONFIG_SNAPSHOT_RESULTS.UNCHANGED;

  await fs.mkdir(getBackupsDir(), { recursive: true });

  const now = Date.now();
  const existing = await listSnapshotEntries();
  const latest = existing[0];

  // The latest snapshot already holds this content, e.g. when the write after it failed.
  if (latest && (await isSnapshotContent(latest.id, previousRaw))) {
    await pruneConfigSnapshots(existing, now);
    return CONFIG_SNAPSHOT_RESULTS.SAVED;
  }

  // The lock serializes writes, so the next sequence is unique and always the newest.
  const id = getSnapshotId((latest?.sequence ?? 0) + 1, now, reason);
  await writeSnapshotFile(id, previousRaw);

  await pruneConfigSnapshots([parseSnapshotId(id)!, ...existing], now);

  return CONFIG_SNAPSHOT_RESULTS.SAVED;
}
