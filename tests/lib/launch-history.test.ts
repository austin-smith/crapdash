import { describe, expect, it } from 'vitest';
import {
  EMPTY_LAUNCH_HISTORY,
  LAUNCH_HALF_LIFE_MS,
  getLaunchRankKey,
  parseLaunchHistory,
  recordLaunch,
} from '@/lib/launch-history';

const now = Date.UTC(2026, 9, 25);

describe('recordLaunch', () => {
  it('starts a new service at one launch', () => {
    expect(recordLaunch(EMPTY_LAUNCH_HISTORY, 'plex', now)).toEqual({
      plex: { score: 1, lastLaunchedAt: now },
    });
  });

  it('decays the previous score before adding a launch', () => {
    const history = { plex: { score: 4, lastLaunchedAt: now - LAUNCH_HALF_LIFE_MS } };

    expect(recordLaunch(history, 'plex', now).plex).toEqual({ score: 3, lastLaunchedAt: now });
  });

  it('does not mutate the previous history', () => {
    const history = { plex: { score: 1, lastLaunchedAt: now } };

    recordLaunch(history, 'grafana', now);

    expect(history).toEqual({ plex: { score: 1, lastLaunchedAt: now } });
  });

  it('keeps storage bounded by forgetting the least-used services', () => {
    const history = Object.fromEntries(
      Array.from({ length: 200 }, (_, index) => [
        `service-${index}`,
        { score: 100, lastLaunchedAt: now - index * 1000 },
      ])
    );

    const next = recordLaunch(history, 'new-service', now);

    expect(Object.keys(next)).toHaveLength(200);
    expect(next['new-service']).toEqual({ score: 1, lastLaunchedAt: now });
    expect(next['service-0']).toBeDefined();
    expect(next['service-199']).toBeUndefined();
  });
});

describe('getLaunchRankKey', () => {
  it('ranks frequent use above occasional use at the same time', () => {
    expect(getLaunchRankKey({ score: 5, lastLaunchedAt: now }))
      .toBeGreaterThan(getLaunchRankKey({ score: 2, lastLaunchedAt: now }));
  });

  it('treats a half-life of age like halving the score', () => {
    expect(getLaunchRankKey({ score: 4, lastLaunchedAt: now - LAUNCH_HALF_LIFE_MS }))
      .toBeCloseTo(getLaunchRankKey({ score: 2, lastLaunchedAt: now }));
  });
});

describe('parseLaunchHistory', () => {
  it('parses stored history', () => {
    const history = { plex: { score: 2.5, lastLaunchedAt: now } };

    expect(parseLaunchHistory(JSON.stringify(history))).toEqual(history);
  });

  it.each([null, '', 'not json', '[]', 'null', '42'])('returns empty history for %j', (raw) => {
    expect(parseLaunchHistory(raw)).toEqual({});
  });

  it('drops malformed entries and extra fields', () => {
    const raw = JSON.stringify({
      plex: { score: 1, lastLaunchedAt: now, extra: true },
      zero: { score: 0, lastLaunchedAt: now },
      text: { score: '1', lastLaunchedAt: now },
      missing: { score: 1 },
      nothing: null,
    });

    expect(parseLaunchHistory(raw)).toEqual({ plex: { score: 1, lastLaunchedAt: now } });
  });
});
