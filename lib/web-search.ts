import {
  DEFAULT_SEARCH_ENGINE,
  SEARCH_BANG_PREFIX,
  SEARCH_ENGINES,
  SEARCH_QUERY_PLACEHOLDER,
  type SearchBang,
  type SearchEngine,
  type SearchSettings,
  type Service,
} from './types';

export interface WebSearchTarget {
  name: string;
  urlTemplate: string;
}

type BuiltInSearchEngine = Exclude<SearchEngine, typeof SEARCH_ENGINES.CUSTOM | typeof SEARCH_ENGINES.NONE>;

export const BUILT_IN_SEARCH_ENGINES: Record<BuiltInSearchEngine, WebSearchTarget> = {
  [SEARCH_ENGINES.DUCKDUCKGO]: { name: 'DuckDuckGo', urlTemplate: 'https://duckduckgo.com/?q=%s' },
  [SEARCH_ENGINES.GOOGLE]: { name: 'Google', urlTemplate: 'https://www.google.com/search?q=%s' },
  [SEARCH_ENGINES.KAGI]: { name: 'Kagi', urlTemplate: 'https://kagi.com/search?q=%s' },
  [SEARCH_ENGINES.BING]: { name: 'Bing', urlTemplate: 'https://www.bing.com/search?q=%s' },
};

export const SEARCH_ENGINE_LABELS: Record<SearchEngine, string> = {
  [SEARCH_ENGINES.DUCKDUCKGO]: BUILT_IN_SEARCH_ENGINES[SEARCH_ENGINES.DUCKDUCKGO].name,
  [SEARCH_ENGINES.GOOGLE]: BUILT_IN_SEARCH_ENGINES[SEARCH_ENGINES.GOOGLE].name,
  [SEARCH_ENGINES.KAGI]: BUILT_IN_SEARCH_ENGINES[SEARCH_ENGINES.KAGI].name,
  [SEARCH_ENGINES.BING]: BUILT_IN_SEARCH_ENGINES[SEARCH_ENGINES.BING].name,
  [SEARCH_ENGINES.CUSTOM]: 'Custom URL',
  [SEARCH_ENGINES.NONE]: 'None',
};

export const DEFAULT_SEARCH_BANGS: SearchBang[] = [
  { trigger: 'g', name: 'Google', url: 'https://www.google.com/search?q=%s' },
  { trigger: 'ddg', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  { trigger: 'gh', name: 'GitHub', url: 'https://github.com/search?q=%s' },
  { trigger: 'yt', name: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s' },
  { trigger: 'w', name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s' },
];

function getUrlTemplateHostname(urlTemplate: string): string | null {
  try {
    return new URL(urlTemplate).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Resolve the configured engine to a name and URL template.
 * Configs without search settings default to DuckDuckGo; returns null when web search is off.
 */
export function getWebSearchTarget(settings: SearchSettings | undefined): WebSearchTarget | null {
  const engine = settings?.engine ?? DEFAULT_SEARCH_ENGINE;

  if (engine === SEARCH_ENGINES.NONE) {
    return null;
  }

  if (engine === SEARCH_ENGINES.CUSTOM) {
    const urlTemplate = settings?.customUrl;
    if (!urlTemplate) return null;

    return {
      name: getUrlTemplateHostname(urlTemplate) ?? 'the web',
      urlTemplate,
    };
  }

  return BUILT_IN_SEARCH_ENGINES[engine];
}

export function buildSearchUrl(urlTemplate: string, query: string): string {
  return urlTemplate.split(SEARCH_QUERY_PLACEHOLDER).join(encodeURIComponent(query));
}

/** Configs without a bang list use the defaults; an empty list turns bangs off. */
export function getSearchBangs(settings: SearchSettings | undefined): SearchBang[] {
  return settings?.bangs ?? DEFAULT_SEARCH_BANGS;
}

export interface BangSearch {
  trigger: string;
  name: string;
  query: string;
  url: string;
}

function getUrlTemplateOrigin(urlTemplate: string): string | null {
  try {
    const { origin } = new URL(urlTemplate);
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
}

/**
 * Match a "!trigger query" prefix against the configured bangs.
 * A bang without a query opens the site itself instead of an empty search.
 */
export function getBangSearch(input: string, bangs: SearchBang[]): BangSearch | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith(SEARCH_BANG_PREFIX)) {
    return null;
  }

  const [token, ...rest] = trimmed.slice(SEARCH_BANG_PREFIX.length).split(/\s+/);
  const trigger = token.toLowerCase();
  const bang = bangs.find((candidate) => candidate.trigger === trigger);
  if (!bang) {
    return null;
  }

  const query = rest.join(' ');
  const url = query
    ? buildSearchUrl(bang.url, query)
    : getUrlTemplateOrigin(bang.url) ?? buildSearchUrl(bang.url, '');

  return { trigger: bang.trigger, name: bang.name, query, url };
}

/**
 * Pick the URL Enter should open from the search box.
 * The selected service wins unless web search is preferred (Shift+Enter) or nothing matched.
 */
export function getSearchEnterUrl({
  activeService,
  webSearchUrl,
  preferWebSearch,
}: {
  activeService: Pick<Service, 'url'> | null;
  webSearchUrl: string | null;
  preferWebSearch: boolean;
}): string | null {
  if (webSearchUrl && (preferWebSearch || !activeService)) {
    return webSearchUrl;
  }

  return activeService?.url ?? null;
}
