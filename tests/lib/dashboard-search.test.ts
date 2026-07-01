import { describe, expect, it } from 'vitest';
import { getDashboardSearchResult, getSearchTokens } from '@/lib/dashboard-search';
import type { Category, Service } from '@/lib/types';

const categories: Category[] = [
  { id: 'media', name: 'Media' },
  { id: 'observability', name: 'Observability' },
  { id: 'empty', name: 'Empty' },
];

const services: Service[] = [
  {
    id: 'plex',
    name: 'Plex',
    description: 'Watch movies and shows',
    url: 'https://plex.example.com',
    categoryId: 'media',
    active: true,
  },
  {
    id: 'overseerr',
    name: 'Overseerr',
    description: 'Request media',
    url: 'https://overseerr.example.com',
    categoryId: 'media',
    active: true,
  },
  {
    id: 'grafana',
    name: 'Grafana',
    description: 'Metrics dashboards',
    url: 'https://grafana.example.com',
    categoryId: 'observability',
    active: true,
  },
];

describe('dashboard search', () => {
  it('returns visible services in category order when the query is empty', () => {
    const result = getDashboardSearchResult({ categories, services, query: '' });

    expect(result.isSearching).toBe(false);
    expect(result.groups.map((group) => group.category.id)).toEqual([
      'media',
      'observability',
    ]);
    expect(result.launchServices.map((service) => service.id)).toEqual([
      'plex',
      'overseerr',
      'grafana',
    ]);
  });

  it('dedupes and normalizes query tokens', () => {
    expect(getSearchTokens('  Media   PLEX media ')).toEqual(['media', 'plex']);
  });

  it('matches a category name and includes all services in that category', () => {
    const result = getDashboardSearchResult({ categories, services, query: 'media' });

    expect(result.isSearching).toBe(true);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.category.id).toBe('media');
    expect(result.launchServices.map((service) => service.id)).toEqual([
      'plex',
      'overseerr',
    ]);
  });

  it('matches tokens across category and service fields', () => {
    const result = getDashboardSearchResult({ categories, services, query: 'media plex' });

    expect(result.groups[0]?.category.id).toBe('media');
    expect(result.launchServices.map((service) => service.id)).toEqual(['plex']);
  });

  it('matches service descriptions', () => {
    const result = getDashboardSearchResult({ categories, services, query: 'metrics' });

    expect(result.launchServices[0]?.id).toBe('grafana');
  });

  it('returns no groups when no service matches', () => {
    const result = getDashboardSearchResult({ categories, services, query: 'does-not-exist' });

    expect(result.groups).toEqual([]);
    expect(result.launchServices).toEqual([]);
  });
});
