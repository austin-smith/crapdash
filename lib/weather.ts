import { z } from 'zod';
import { WEATHER_UNITS, type WeatherLocation, type WeatherUnits } from './types';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Open-Meteo refreshes current conditions every 15 minutes; 10 keeps us comfortably current. */
export const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
/** How long to keep showing the last good report while Open-Meteo is unreachable. */
export const WEATHER_STALE_TTL_MS = 6 * 60 * 60 * 1000;
/** After a failure, skip refetching for a while so offline renders don't each wait on a timeout. */
export const WEATHER_RETRY_DELAY_MS = 60 * 1000;
const WEATHER_REQUEST_TIMEOUT_MS = 5_000;
const GEOCODING_RESULT_LIMIT = 6;

export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'freezing-rain'
  | 'snow'
  | 'thunderstorm'
  | 'unknown';

export interface WeatherConditions {
  temperature: number;
  apparentTemperature: number;
  high: number | null;
  low: number | null;
  humidity: number | null;
  windSpeed: number | null;
  weatherCode: number;
  condition: WeatherCondition;
  description: string;
  isDay: boolean;
}

export type WeatherResult =
  | {
    status: 'ok';
    conditions: WeatherConditions;
    fetchedAt: number;
    /** Milliseconds since the report was fetched. */
    ageMs: number;
    /** True when Open-Meteo is unreachable and an older cached report is being served. */
    stale: boolean;
  }
  | { status: 'unavailable' };

// https://open-meteo.com/en/docs#weather_variable_documentation (WMO weather interpretation codes)
const WMO_CODES: Record<number, { condition: WeatherCondition; description: string }> = {
  0: { condition: 'clear', description: 'Clear' },
  1: { condition: 'clear', description: 'Mainly clear' },
  2: { condition: 'partly-cloudy', description: 'Partly cloudy' },
  3: { condition: 'cloudy', description: 'Overcast' },
  45: { condition: 'fog', description: 'Fog' },
  48: { condition: 'fog', description: 'Rime fog' },
  51: { condition: 'drizzle', description: 'Light drizzle' },
  53: { condition: 'drizzle', description: 'Drizzle' },
  55: { condition: 'drizzle', description: 'Heavy drizzle' },
  56: { condition: 'freezing-rain', description: 'Freezing drizzle' },
  57: { condition: 'freezing-rain', description: 'Freezing drizzle' },
  61: { condition: 'rain', description: 'Light rain' },
  63: { condition: 'rain', description: 'Rain' },
  65: { condition: 'rain', description: 'Heavy rain' },
  66: { condition: 'freezing-rain', description: 'Freezing rain' },
  67: { condition: 'freezing-rain', description: 'Freezing rain' },
  71: { condition: 'snow', description: 'Light snow' },
  73: { condition: 'snow', description: 'Snow' },
  75: { condition: 'snow', description: 'Heavy snow' },
  77: { condition: 'snow', description: 'Snow grains' },
  80: { condition: 'rain', description: 'Light showers' },
  81: { condition: 'rain', description: 'Showers' },
  82: { condition: 'rain', description: 'Heavy showers' },
  85: { condition: 'snow', description: 'Snow showers' },
  86: { condition: 'snow', description: 'Heavy snow showers' },
  95: { condition: 'thunderstorm', description: 'Thunderstorm' },
  96: { condition: 'thunderstorm', description: 'Thunderstorm with hail' },
  99: { condition: 'thunderstorm', description: 'Thunderstorm with hail' },
};

export function getWeatherCondition(code: number): { condition: WeatherCondition; description: string } {
  return WMO_CODES[code] ?? { condition: 'unknown', description: 'Unknown' };
}

const forecastResponseSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number().nullish(),
    weather_code: z.number().int(),
    is_day: z.number(),
    wind_speed_10m: z.number().nullish(),
  }),
  daily: z
    .object({
      temperature_2m_max: z.array(z.number().nullable()),
      temperature_2m_min: z.array(z.number().nullable()),
    })
    .optional(),
});

/**
 * Normalizes an Open-Meteo forecast response. Throws if the payload is missing required fields.
 */
export function parseForecastResponse(payload: unknown): WeatherConditions {
  const { current, daily } = forecastResponseSchema.parse(payload);

  return {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    high: daily?.temperature_2m_max[0] ?? null,
    low: daily?.temperature_2m_min[0] ?? null,
    humidity: current.relative_humidity_2m ?? null,
    windSpeed: current.wind_speed_10m ?? null,
    weatherCode: current.weather_code,
    ...getWeatherCondition(current.weather_code),
    isDay: current.is_day === 1,
  };
}

const geocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        country: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * Normalizes an Open-Meteo geocoding response into labeled locations.
 */
export function parseGeocodingResponse(payload: unknown): WeatherLocation[] {
  const { results = [] } = geocodingResponseSchema.parse(payload);

  return results.map((result) => {
    const parts = [result.name, result.admin1, result.country].filter(
      (part, index, all): part is string => !!part && all.indexOf(part) === index
    );
    return {
      name: parts.join(', '),
      latitude: result.latitude,
      longitude: result.longitude,
    };
  });
}

export function buildForecastUrl(location: Pick<WeatherLocation, 'latitude' | 'longitude'>, units: WeatherUnits): string {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '1',
  });

  if (units === WEATHER_UNITS.IMPERIAL) {
    params.set('temperature_unit', 'fahrenheit');
    params.set('wind_speed_unit', 'mph');
  }

  return `${FORECAST_URL}?${params}`;
}

export function buildGeocodingUrl(query: string): string {
  const params = new URLSearchParams({
    name: query,
    count: String(GEOCODING_RESULT_LIMIT),
    language: 'en',
    format: 'json',
  });
  return `${GEOCODING_URL}?${params}`;
}

interface WeatherClientOptions {
  fetch?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

interface CacheEntry {
  conditions: WeatherConditions;
  fetchedAt: number;
}

function getCacheKey(location: Pick<WeatherLocation, 'latitude' | 'longitude'>, units: WeatherUnits): string {
  return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}:${units}`;
}

/**
 * Creates an Open-Meteo client with an in-process cache. Reports are reused for
 * WEATHER_CACHE_TTL_MS, concurrent requests for the same location share one fetch,
 * and when Open-Meteo is unreachable the last good report is served (marked stale)
 * for up to WEATHER_STALE_TTL_MS.
 */
export function createWeatherClient(options: WeatherClientOptions = {}) {
  // Resolve the global lazily so runtime instrumentation (and test spies) apply.
  const fetchImpl: typeof fetch = options.fetch ?? ((input, init) => fetch(input, init));
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? WEATHER_REQUEST_TIMEOUT_MS;

  const cache = new Map<string, CacheEntry>();
  const lastFailureAt = new Map<string, number>();
  const inflight = new Map<string, Promise<WeatherResult>>();

  async function fetchJson(url: string): Promise<unknown> {
    const response = await fetchImpl(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo responded with ${response.status}`);
    }
    return response.json();
  }

  function fromCache(entry: CacheEntry, stale: boolean): WeatherResult {
    return {
      status: 'ok',
      conditions: entry.conditions,
      fetchedAt: entry.fetchedAt,
      ageMs: now() - entry.fetchedAt,
      stale,
    };
  }

  function getFallback(key: string): WeatherResult {
    const entry = cache.get(key);
    if (entry && now() - entry.fetchedAt < WEATHER_STALE_TTL_MS) {
      return fromCache(entry, true);
    }
    cache.delete(key);
    return { status: 'unavailable' };
  }

  async function refresh(key: string, location: WeatherLocation, units: WeatherUnits): Promise<WeatherResult> {
    try {
      const conditions = parseForecastResponse(await fetchJson(buildForecastUrl(location, units)));
      const entry = { conditions, fetchedAt: now() };
      cache.set(key, entry);
      lastFailureAt.delete(key);
      return fromCache(entry, false);
    } catch (error) {
      console.warn(`Weather fetch failed for ${location.name}:`, error instanceof Error ? error.message : error);
      lastFailureAt.set(key, now());
      return getFallback(key);
    }
  }

  async function getWeather(location: WeatherLocation, units: WeatherUnits): Promise<WeatherResult> {
    const key = getCacheKey(location, units);
    const entry = cache.get(key);

    if (entry && now() - entry.fetchedAt < WEATHER_CACHE_TTL_MS) {
      return fromCache(entry, false);
    }

    const failedAt = lastFailureAt.get(key);
    if (failedAt !== undefined && now() - failedAt < WEATHER_RETRY_DELAY_MS) {
      return getFallback(key);
    }

    const pending = inflight.get(key);
    if (pending) return pending;

    const request = refresh(key, location, units).finally(() => inflight.delete(key));
    inflight.set(key, request);
    return request;
  }

  /**
   * Looks up places by name via Open-Meteo geocoding. Throws on network or response errors.
   */
  async function searchLocations(query: string): Promise<WeatherLocation[]> {
    return parseGeocodingResponse(await fetchJson(buildGeocodingUrl(query)));
  }

  return { getWeather, searchLocations };
}

const defaultWeatherClient = createWeatherClient();

export const getWeather = defaultWeatherClient.getWeather;
export const searchWeatherLocations = defaultWeatherClient.searchLocations;
