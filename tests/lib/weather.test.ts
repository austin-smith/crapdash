import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WEATHER_UNITS } from '@/lib/types';
import {
  WEATHER_CACHE_TTL_MS,
  WEATHER_RETRY_DELAY_MS,
  WEATHER_STALE_TTL_MS,
  buildForecastUrl,
  createWeatherClient,
  getWeatherCondition,
  parseForecastResponse,
  parseGeocodingResponse,
} from '@/lib/weather';

const location = { name: 'Austin', latitude: 30.2672, longitude: -97.7431 };

function forecastPayload(temperature = 85.1, weatherCode = 2) {
  return {
    latitude: 30.269146,
    longitude: -97.75338,
    current: {
      time: '2026-10-11T20:15',
      interval: 900,
      temperature_2m: temperature,
      apparent_temperature: 82.2,
      relative_humidity_2m: 39,
      weather_code: weatherCode,
      is_day: 0,
      wind_speed_10m: 12.4,
    },
    daily: {
      time: ['2026-10-11'],
      temperature_2m_max: [91.8],
      temperature_2m_min: [70.7],
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('weather response parsing', () => {
  it('normalizes an Open-Meteo forecast', () => {
    expect(parseForecastResponse(forecastPayload())).toEqual({
      temperature: 85.1,
      apparentTemperature: 82.2,
      high: 91.8,
      low: 70.7,
      humidity: 39,
      windSpeed: 12.4,
      weatherCode: 2,
      condition: 'partly-cloudy',
      description: 'Partly cloudy',
      isDay: false,
    });
  });

  it('tolerates missing optional fields', () => {
    const current: Record<string, unknown> = { ...forecastPayload().current };
    delete current.relative_humidity_2m;
    delete current.wind_speed_10m;

    expect(parseForecastResponse({ current })).toMatchObject({
      high: null,
      low: null,
      humidity: null,
      windSpeed: null,
    });
  });

  it('rejects payloads without current conditions', () => {
    expect(() => parseForecastResponse({ error: true, reason: 'Latitude must be in range' })).toThrow();
    expect(() => parseForecastResponse({ current: { ...forecastPayload().current, temperature_2m: null } })).toThrow();
  });

  it('maps WMO codes to conditions', () => {
    expect(getWeatherCondition(0)).toEqual({ condition: 'clear', description: 'Clear' });
    expect(getWeatherCondition(65)).toEqual({ condition: 'rain', description: 'Heavy rain' });
    expect(getWeatherCondition(75)).toEqual({ condition: 'snow', description: 'Heavy snow' });
    expect(getWeatherCondition(99)).toEqual({ condition: 'thunderstorm', description: 'Thunderstorm with hail' });
    expect(getWeatherCondition(42)).toEqual({ condition: 'unknown', description: 'Unknown' });
  });

  it('labels geocoding results without repeating parts', () => {
    expect(parseGeocodingResponse({
      results: [
        { id: 1, name: 'Austin', latitude: 30.26715, longitude: -97.74306, admin1: 'Texas', country: 'United States' },
        { id: 2, name: 'Singapore', latitude: 1.28967, longitude: 103.85007, admin1: 'Singapore', country: 'Singapore' },
        { id: 3, name: 'Nowhere', latitude: 0, longitude: 0 },
      ],
    })).toEqual([
      { name: 'Austin, Texas, United States', latitude: 30.26715, longitude: -97.74306 },
      { name: 'Singapore', latitude: 1.28967, longitude: 103.85007 },
      { name: 'Nowhere', latitude: 0, longitude: 0 },
    ]);
  });

  it('treats a geocoding response without results as no matches', () => {
    expect(parseGeocodingResponse({ generationtime_ms: 0.4 })).toEqual([]);
  });

  it('requests imperial units only when configured', () => {
    const imperial = new URL(buildForecastUrl(location, WEATHER_UNITS.IMPERIAL));
    const metric = new URL(buildForecastUrl(location, WEATHER_UNITS.METRIC));

    expect(imperial.searchParams.get('temperature_unit')).toBe('fahrenheit');
    expect(imperial.searchParams.get('wind_speed_unit')).toBe('mph');
    expect(metric.searchParams.has('temperature_unit')).toBe(false);
    expect(metric.searchParams.get('latitude')).toBe('30.2672');
  });
});

describe('weather client caching', () => {
  let now: number;
  const clock = () => now;

  beforeEach(() => {
    now = 1_000_000;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('reuses a fresh report until the cache TTL expires', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(forecastPayload(80)));
    const client = createWeatherClient({ fetch: fetchMock, now: clock });

    const first = await client.getWeather(location, WEATHER_UNITS.IMPERIAL);
    now += WEATHER_CACHE_TTL_MS - 1;
    const second = await client.getWeather(location, WEATHER_UNITS.IMPERIAL);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({ status: 'ok', stale: false, ageMs: 0 });
    expect(second).toMatchObject({ status: 'ok', stale: false, ageMs: WEATHER_CACHE_TTL_MS - 1 });

    fetchMock.mockResolvedValueOnce(jsonResponse(forecastPayload(81)));
    now += 1;
    const third = await client.getWeather(location, WEATHER_UNITS.IMPERIAL);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(third).toMatchObject({ status: 'ok', stale: false, conditions: { temperature: 81 } });
  });

  it('caches each unit system separately', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(forecastPayload()));
    const client = createWeatherClient({ fetch: fetchMock, now: clock });

    await client.getWeather(location, WEATHER_UNITS.IMPERIAL);
    await client.getWeather(location, WEATHER_UNITS.METRIC);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares one request between concurrent callers', async () => {
    let resolveFetch: (response: Response) => void = () => {};
    const fetchMock = vi.fn<typeof fetch>(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    const client = createWeatherClient({ fetch: fetchMock, now: clock });

    const requests = [
      client.getWeather(location, WEATHER_UNITS.METRIC),
      client.getWeather(location, WEATHER_UNITS.METRIC),
    ];
    resolveFetch(jsonResponse(forecastPayload()));

    const [first, second] = await Promise.all(requests);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it('serves the last good report as stale when a refresh fails', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(forecastPayload(72)));
    const client = createWeatherClient({ fetch: fetchMock, now: clock });
    await client.getWeather(location, WEATHER_UNITS.IMPERIAL);

    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    now += WEATHER_CACHE_TTL_MS + 1;
    const result = await client.getWeather(location, WEATHER_UNITS.IMPERIAL);

    expect(result).toMatchObject({
      status: 'ok',
      stale: true,
      ageMs: WEATHER_CACHE_TTL_MS + 1,
      conditions: { temperature: 72 },
    });
  });

  it('treats error responses as failures', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ error: true, reason: 'Internal error' }, 500));
    const client = createWeatherClient({ fetch: fetchMock, now: clock });

    await expect(client.getWeather(location, WEATHER_UNITS.METRIC)).resolves.toEqual({ status: 'unavailable' });
  });

  it('backs off after a failure instead of retrying on every render', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => { throw new TypeError('fetch failed'); });
    const client = createWeatherClient({ fetch: fetchMock, now: clock });

    await client.getWeather(location, WEATHER_UNITS.METRIC);
    now += WEATHER_RETRY_DELAY_MS - 1;
    await client.getWeather(location, WEATHER_UNITS.METRIC);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(jsonResponse(forecastPayload()));
    now += 1;
    const recovered = await client.getWeather(location, WEATHER_UNITS.METRIC);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(recovered).toMatchObject({ status: 'ok', stale: false });
  });

  it('stops serving stale reports once they are too old', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(forecastPayload()));
    const client = createWeatherClient({ fetch: fetchMock, now: clock });
    await client.getWeather(location, WEATHER_UNITS.METRIC);

    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    now += WEATHER_STALE_TTL_MS;

    await expect(client.getWeather(location, WEATHER_UNITS.METRIC)).resolves.toEqual({ status: 'unavailable' });
  });

  it('searches locations through the geocoding endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({
      results: [{ name: 'Austin', latitude: 30.26715, longitude: -97.74306, admin1: 'Texas', country: 'United States' }],
    }));
    const client = createWeatherClient({ fetch: fetchMock, now: clock });

    await expect(client.searchLocations('Austin')).resolves.toEqual([
      { name: 'Austin, Texas, United States', latitude: 30.26715, longitude: -97.74306 },
    ]);

    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestedUrl.hostname).toBe('geocoding-api.open-meteo.com');
    expect(requestedUrl.searchParams.get('name')).toBe('Austin');
  });

  it('surfaces geocoding failures to the caller', async () => {
    const client = createWeatherClient({
      fetch: vi.fn<typeof fetch>(async () => jsonResponse({ error: true }, 400)),
      now: clock,
    });

    await expect(client.searchLocations('Austin')).rejects.toThrow('Open-Meteo responded with 400');
  });
});
