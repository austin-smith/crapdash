import {
  DEFAULT_SEARCH_ENGINE,
  SEARCH_ENGINES,
  SEARCH_QUERY_PLACEHOLDER,
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
