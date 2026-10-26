import type { Category, Service } from '@/lib/types';

export interface DashboardSearchGroup {
  category: Category;
  services: Service[];
}

export interface DashboardSearchResult {
  groups: DashboardSearchGroup[];
  launchServices: Service[];
  tokens: string[];
  isSearching: boolean;
  /** Services with a token that only matches the URL host, so the card must reveal its URL. */
  hostMatchServiceIds: ReadonlySet<string>;
}

export interface UrlHostParts {
  beforeHost: string;
  host: string;
  afterHost: string;
}

interface DashboardSearchInput {
  categories: Category[];
  services: Service[];
  query: string;
}

export function getSearchTokens(query: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const token of query.toLocaleLowerCase().trim().split(/\s+/)) {
    if (!token || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }

  return tokens;
}

const URL_HOST_PATTERN = /^([a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?)([^/?#]*)/i;

/**
 * Splits a URL around its host (including any port) as written, so matching and
 * highlighting operate on the same text the user sees.
 */
export function getUrlHostParts(url: string): UrlHostParts | null {
  const match = URL_HOST_PATTERN.exec(url);
  if (!match?.[2]) return null;

  const [prefix, beforeHost, host] = match;

  return {
    beforeHost,
    host,
    afterHost: url.slice(prefix.length),
  };
}

function getUrlHost(url: string): string {
  return getUrlHostParts(url)?.host ?? '';
}

function includesAllTokens(value: string, tokens: string[]): boolean {
  const normalized = value.toLocaleLowerCase();
  return tokens.every((token) => normalized.includes(token));
}

function getVisibleSearchText(service: Service, category: Category): string {
  return `${service.name} ${service.description} ${category.name}`;
}

function serviceMatchesTokens(service: Service, category: Category, tokens: string[]): boolean {
  return includesAllTokens(
    `${getVisibleSearchText(service, category)} ${getUrlHost(service.url)}`,
    tokens
  );
}

function hasHostOnlyToken(service: Service, category: Category, tokens: string[]): boolean {
  const visibleText = getVisibleSearchText(service, category).toLocaleLowerCase();
  const host = getUrlHost(service.url).toLocaleLowerCase();

  return tokens.some((token) => !visibleText.includes(token) && host.includes(token));
}

function groupServicesByCategory(services: Service[]): Map<string, Service[]> {
  const servicesByCategory = new Map<string, Service[]>();

  for (const service of services) {
    const categoryServices = servicesByCategory.get(service.categoryId);

    if (categoryServices) {
      categoryServices.push(service);
    } else {
      servicesByCategory.set(service.categoryId, [service]);
    }
  }

  return servicesByCategory;
}

export function getDashboardSearchResult({
  categories,
  services,
  query,
}: DashboardSearchInput): DashboardSearchResult {
  const tokens = getSearchTokens(query);
  const isSearching = tokens.length > 0;
  const servicesByCategory = groupServicesByCategory(services);
  const groups: DashboardSearchGroup[] = [];
  const launchServices: Service[] = [];
  const hostMatchServiceIds = new Set<string>();

  for (const category of categories) {
    const categoryServices = servicesByCategory.get(category.id) ?? [];
    if (categoryServices.length === 0) continue;

    const visibleServices = isSearching
      ? categoryServices.filter((service) => (
        includesAllTokens(category.name, tokens) ||
        serviceMatchesTokens(service, category, tokens)
      ))
      : categoryServices;

    if (visibleServices.length === 0) continue;

    if (isSearching) {
      for (const service of visibleServices) {
        if (hasHostOnlyToken(service, category, tokens)) {
          hostMatchServiceIds.add(service.id);
        }
      }
    }

    groups.push({ category, services: visibleServices });
    launchServices.push(...visibleServices);
  }

  return {
    groups,
    launchServices,
    tokens,
    isSearching,
    hostMatchServiceIds,
  };
}
