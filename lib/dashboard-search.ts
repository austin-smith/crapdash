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

function includesAllTokens(value: string, tokens: string[]): boolean {
  const normalized = value.toLocaleLowerCase();
  return tokens.every((token) => normalized.includes(token));
}

function serviceMatchesTokens(service: Service, category: Category, tokens: string[]): boolean {
  return includesAllTokens(
    `${service.name} ${service.description} ${category.name}`,
    tokens
  );
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

    groups.push({ category, services: visibleServices });
    launchServices.push(...visibleServices);
  }

  return {
    groups,
    launchServices,
    tokens,
    isSearching,
  };
}
