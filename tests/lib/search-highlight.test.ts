import { describe, expect, it } from 'vitest';
import { getHighlightParts } from '@/lib/search-highlight';

describe('search highlighting', () => {
  it('returns a single plain part when there are no tokens', () => {
    expect(getHighlightParts('Grafana', [])).toEqual([
      { text: 'Grafana', highlight: false },
    ]);
  });

  it('highlights matches case-insensitively', () => {
    expect(getHighlightParts('Grafana Metrics', ['graf', 'metrics'])).toEqual([
      { text: 'Graf', highlight: true },
      { text: 'ana ', highlight: false },
      { text: 'Metrics', highlight: true },
    ]);
  });

  it('prefers longer matches when tokens overlap', () => {
    expect(getHighlightParts('Overseerr', ['over', 'overseer'])).toEqual([
      { text: 'Overseer', highlight: true },
      { text: 'r', highlight: false },
    ]);
  });

  it('returns a plain part when nothing matches', () => {
    expect(getHighlightParts('Plex', ['grafana'])).toEqual([
      { text: 'Plex', highlight: false },
    ]);
  });
});
