import { describe, expect, it } from 'vitest';
import { getDashboardSearchResult, getSearchTokens, getUrlHostParts } from '@/lib/dashboard-search';
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
  {
    id: 'jellyfin',
    name: 'Jellyfin',
    description: 'Stream music',
    url: 'http://nas.local:8096/web/index.html?server=8096',
    categoryId: 'media',
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
      'jellyfin',
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
      'jellyfin',
    ]);
    expect(result.hostMatchServiceIds.size).toBe(0);
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

  it('matches the URL hostname', () => {
    const result = getDashboardSearchResult({ categories, services, query: 'nas.local' });

    expect(result.launchServices.map((service) => service.id)).toEqual(['jellyfin']);
    expect([...result.hostMatchServiceIds]).toEqual(['jellyfin']);
  });

  it('matches the URL port and host with port', () => {
    expect(
      getDashboardSearchResult({ categories, services, query: '8096' }).launchServices.map((service) => service.id)
    ).toEqual(['jellyfin']);
    expect(
      getDashboardSearchResult({ categories, services, query: 'NAS.local:8096' }).launchServices.map((service) => service.id)
    ).toEqual(['jellyfin']);
  });

  it('combines host tokens with visible fields', () => {
    const result = getDashboardSearchResult({ categories, services, query: 'stream 8096' });

    expect(result.launchServices.map((service) => service.id)).toEqual(['jellyfin']);
    expect([...result.hostMatchServiceIds]).toEqual(['jellyfin']);
  });

  it('does not match the URL scheme, path, or query string', () => {
    for (const query of ['https', 'index.html', 'server']) {
      expect(getDashboardSearchResult({ categories, services, query }).launchServices).toEqual([]);
    }
  });

  it('does not reveal the URL when every token matches a visible field', () => {
    const result = getDashboardSearchResult({ categories, services, query: 'grafana' });

    expect(result.launchServices.map((service) => service.id)).toEqual(['grafana']);
    expect(result.hostMatchServiceIds.size).toBe(0);
  });

  it('returns no groups when no service matches', () => {
    const result = getDashboardSearchResult({ categories, services, query: 'does-not-exist' });

    expect(result.groups).toEqual([]);
    expect(result.launchServices).toEqual([]);
  });
});

describe('getUrlHostParts', () => {
  it('splits a URL around its host and port', () => {
    expect(getUrlHostParts('http://nas.local:8096/web?x=1')).toEqual({
      beforeHost: 'http://',
      host: 'nas.local:8096',
      afterHost: '/web?x=1',
    });
  });

  it('excludes credentials from the host', () => {
    expect(getUrlHostParts('https://user:pass@router.lan#status')).toEqual({
      beforeHost: 'https://user:pass@',
      host: 'router.lan',
      afterHost: '#status',
    });
  });

  it('preserves the host as written', () => {
    expect(getUrlHostParts('https://NAS.Local:443/')?.host).toBe('NAS.Local:443');
  });

  it('returns null for URLs without a host', () => {
    expect(getUrlHostParts('mailto:me@example.com')).toBeNull();
    expect(getUrlHostParts('not a url')).toBeNull();
  });
});
