import { describe, expect, it } from 'vitest';
import { SEARCH_ENGINES } from '@/lib/types';
import {
  DEFAULT_SEARCH_BANGS,
  buildSearchUrl,
  getBangSearch,
  getSearchBangs,
  getSearchEnterUrl,
  getWebSearchTarget,
} from '@/lib/web-search';

describe('getWebSearchTarget', () => {
  it('defaults to DuckDuckGo when search is not configured', () => {
    expect(getWebSearchTarget(undefined)).toEqual({
      name: 'DuckDuckGo',
      urlTemplate: 'https://duckduckgo.com/?q=%s',
    });
  });

  it('resolves built-in engines', () => {
    expect(getWebSearchTarget({ engine: SEARCH_ENGINES.KAGI })).toEqual({
      name: 'Kagi',
      urlTemplate: 'https://kagi.com/search?q=%s',
    });
  });

  it('returns null when web search is off', () => {
    expect(getWebSearchTarget({ engine: SEARCH_ENGINES.NONE })).toBeNull();
  });

  it('names custom engines after the template hostname', () => {
    expect(getWebSearchTarget({
      engine: SEARCH_ENGINES.CUSTOM,
      customUrl: 'https://searx.local:8888/search?q=%s',
    })).toEqual({
      name: 'searx.local',
      urlTemplate: 'https://searx.local:8888/search?q=%s',
    });
  });

  it('returns null for a custom engine without a URL', () => {
    expect(getWebSearchTarget({ engine: SEARCH_ENGINES.CUSTOM })).toBeNull();
  });
});

describe('buildSearchUrl', () => {
  it('encodes the query into the placeholder', () => {
    expect(buildSearchUrl('https://duckduckgo.com/?q=%s', 'cats & dogs #1?'))
      .toBe('https://duckduckgo.com/?q=cats%20%26%20dogs%20%231%3F');
  });

  it('encodes unicode and replaces every placeholder', () => {
    expect(buildSearchUrl('https://example.com/%s?q=%s', 'café'))
      .toBe('https://example.com/caf%C3%A9?q=caf%C3%A9');
  });

  it('does not substitute placeholders or replacement patterns inside the query', () => {
    expect(buildSearchUrl('https://example.com/?q=%s', '%s $& $1'))
      .toBe('https://example.com/?q=%25s%20%24%26%20%241');
  });
});

describe('getSearchEnterUrl', () => {
  const activeService = { url: 'http://nas.local:8096' };
  const webSearchUrl = 'https://duckduckgo.com/?q=jelly';

  it('opens the selected service by default', () => {
    expect(getSearchEnterUrl({ activeService, webSearchUrl, preferWebSearch: false }))
      .toBe('http://nas.local:8096');
  });

  it('searches the web when web search is preferred', () => {
    expect(getSearchEnterUrl({ activeService, webSearchUrl, preferWebSearch: true }))
      .toBe(webSearchUrl);
  });

  it('searches the web when nothing matched', () => {
    expect(getSearchEnterUrl({ activeService: null, webSearchUrl, preferWebSearch: false }))
      .toBe(webSearchUrl);
  });

  it('falls back to the selected service when web search is off', () => {
    expect(getSearchEnterUrl({ activeService, webSearchUrl: null, preferWebSearch: true }))
      .toBe('http://nas.local:8096');
    expect(getSearchEnterUrl({ activeService: null, webSearchUrl: null, preferWebSearch: false }))
      .toBeNull();
  });
});

describe('getSearchBangs', () => {
  it('uses the default bangs when none are configured', () => {
    expect(getSearchBangs(undefined)).toBe(DEFAULT_SEARCH_BANGS);
    expect(getSearchBangs({ engine: SEARCH_ENGINES.GOOGLE })).toBe(DEFAULT_SEARCH_BANGS);
  });

  it('respects an empty bang list', () => {
    expect(getSearchBangs({ engine: SEARCH_ENGINES.GOOGLE, bangs: [] })).toEqual([]);
  });
});

describe('getBangSearch', () => {
  const bangs = [
    { trigger: 'gh', name: 'GitHub', url: 'https://github.com/search?q=%s' },
    { trigger: 'w', name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s' },
  ];

  it('searches the matching bang with the rest of the query', () => {
    expect(getBangSearch('!gh react hooks', bangs)).toEqual({
      trigger: 'gh',
      name: 'GitHub',
      query: 'react hooks',
      url: 'https://github.com/search?q=react%20hooks',
    });
  });

  it('matches triggers case-insensitively and ignores surrounding whitespace', () => {
    expect(getBangSearch('  !GH   react  ', bangs)?.url).toBe('https://github.com/search?q=react');
  });

  it('opens the site when the bang has no query', () => {
    expect(getBangSearch('!w', bangs)).toEqual({
      trigger: 'w',
      name: 'Wikipedia',
      query: '',
      url: 'https://en.wikipedia.org',
    });
    expect(getBangSearch('!gh ', bangs)?.url).toBe('https://github.com');
  });

  it.each([
    'react !gh',
    '!ghreact',
    '!x react',
    '!',
    'gh react',
  ])('ignores %j', (input) => {
    expect(getBangSearch(input, bangs)).toBeNull();
  });

  it('does nothing when bangs are off', () => {
    expect(getBangSearch('!gh react', [])).toBeNull();
  });
});
