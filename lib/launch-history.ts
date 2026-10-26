export const LAUNCH_HISTORY_STORAGE_KEY = 'launch-history';

/** A launch counts half as much after this long, so recent use outweighs old habits */
export const LAUNCH_HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000;

const MAX_LAUNCH_HISTORY_ENTRIES = 200;

export interface LaunchHistoryEntry {
  /** Launch count, decayed by LAUNCH_HALF_LIFE_MS as of lastLaunchedAt */
  score: number;
  lastLaunchedAt: number;
}

export type LaunchHistory = Readonly<Record<string, LaunchHistoryEntry>>;

export const EMPTY_LAUNCH_HISTORY: LaunchHistory = Object.freeze({});

function isLaunchHistoryEntry(value: unknown): value is LaunchHistoryEntry {
  if (!value || typeof value !== 'object') return false;

  const { score, lastLaunchedAt } = value as Record<string, unknown>;
  return (
    typeof score === 'number' && Number.isFinite(score) && score > 0 &&
    typeof lastLaunchedAt === 'number' && Number.isFinite(lastLaunchedAt)
  );
}

/** Parse stored history, dropping anything malformed instead of failing. */
export function parseLaunchHistory(raw: string | null): LaunchHistory {
  if (!raw) return EMPTY_LAUNCH_HISTORY;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_LAUNCH_HISTORY;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return EMPTY_LAUNCH_HISTORY;
  }

  const history: Record<string, LaunchHistoryEntry> = {};
  for (const [serviceId, entry] of Object.entries(parsed)) {
    if (isLaunchHistoryEntry(entry)) {
      history[serviceId] = { score: entry.score, lastLaunchedAt: entry.lastLaunchedAt };
    }
  }

  return history;
}

/**
 * Rank key for a launch history entry: higher means used more often and more recently.
 * Every score decays at the same rate, so comparing log2(score) plus elapsed half-lives
 * gives the same order at any moment and the key never needs the current time.
 */
export function getLaunchRankKey(entry: LaunchHistoryEntry): number {
  return Math.log2(entry.score) + entry.lastLaunchedAt / LAUNCH_HALF_LIFE_MS;
}

export function recordLaunch(history: LaunchHistory, serviceId: string, now: number): LaunchHistory {
  const previous = history[serviceId];
  const elapsed = previous ? Math.max(0, now - previous.lastLaunchedAt) : 0;
  const decayedScore = previous ? previous.score * 0.5 ** (elapsed / LAUNCH_HALF_LIFE_MS) : 0;

  const next: Record<string, LaunchHistoryEntry> = {
    ...history,
    [serviceId]: { score: decayedScore + 1, lastLaunchedAt: now },
  };

  const serviceIds = Object.keys(next);
  if (serviceIds.length <= MAX_LAUNCH_HISTORY_ENTRIES) {
    return next;
  }

  // Forget the least-used services so storage stays bounded, always keeping this launch
  const kept = serviceIds
    .filter((id) => id !== serviceId)
    .sort((a, b) => getLaunchRankKey(next[b]) - getLaunchRankKey(next[a]))
    .slice(0, MAX_LAUNCH_HISTORY_ENTRIES - 1);

  return Object.fromEntries([serviceId, ...kept].map((id) => [id, next[id]]));
}
