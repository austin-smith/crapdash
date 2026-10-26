import { readFile, writeFile } from 'fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWidget,
  deleteWidget,
  getConfigEditorState,
  reorderWidgets,
  saveConfigJson,
  searchWeatherLocations,
  setWidgetEnabled,
  updateWidget,
} from '@/lib/actions';
import { getConfigPath } from '@/lib/paths';
import { WEATHER_UNITS, WIDGET_TYPES, type DashboardConfig, type Widget } from '@/lib/types';
import { createTestDataDir, removeTestDataDir } from './test-data-dir';

let rootDir: string;

const austin = { name: 'Austin, Texas, United States', latitude: 30.2672, longitude: -97.7431 };

async function writeConfig(config: DashboardConfig): Promise<void> {
  await writeFile(getConfigPath(), JSON.stringify(config, null, 2));
}

async function readSavedConfig(): Promise<DashboardConfig> {
  return JSON.parse(await readFile(getConfigPath(), 'utf-8')) as DashboardConfig;
}

async function writeWidgets(widgets: Widget[]): Promise<void> {
  await writeConfig({ categories: [], services: [], widgets });
}

describe('widget actions', () => {
  beforeEach(async () => {
    rootDir = await createTestDataDir('widget-actions');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await removeTestDataDir(rootDir);
  });

  it('adds widgets to configs that have none, with readable unique IDs', async () => {
    await writeConfig({ categories: [], services: [] });

    const first = await createWidget({ type: WIDGET_TYPES.CLOCK });
    const second = await createWidget({ type: WIDGET_TYPES.CLOCK, timeZone: 'Europe/London' });
    const weather = await createWidget({ type: WIDGET_TYPES.WEATHER, location: austin, units: WEATHER_UNITS.IMPERIAL });

    expect(first).toEqual({ success: true, data: { id: 'clock', type: WIDGET_TYPES.CLOCK, enabled: true } });
    expect(second.success && second.data.id).toBe('clock-2');
    expect(weather.success && weather.data.id).toBe('weather');

    const saved = await readSavedConfig();
    expect(saved.widgets?.map((widget) => widget.id)).toEqual(['clock', 'clock-2', 'weather']);
  });

  it('returns field errors for invalid settings without writing', async () => {
    await writeConfig({ categories: [], services: [] });

    const result = await createWidget({
      type: WIDGET_TYPES.WEATHER,
      location: { ...austin, latitude: 120 },
      units: WEATHER_UNITS.METRIC,
    });

    expect(result).toEqual({
      success: false,
      errors: [{ field: 'location.latitude', message: 'Latitude must be between -90 and 90' }],
    });
    expect((await readSavedConfig()).widgets).toBeUndefined();
  });

  it('replaces settings on update while keeping id and enabled state', async () => {
    await writeWidgets([
      { id: 'clock', type: WIDGET_TYPES.CLOCK, enabled: false, timeZone: 'Asia/Tokyo', showSeconds: true },
    ]);

    const result = await updateWidget('clock', { type: WIDGET_TYPES.CLOCK, hourCycle: '24h' });

    expect(result).toEqual({
      success: true,
      data: { id: 'clock', type: WIDGET_TYPES.CLOCK, enabled: false, hourCycle: '24h' },
    });
    expect((await readSavedConfig()).widgets).toEqual([
      { type: WIDGET_TYPES.CLOCK, hourCycle: '24h', id: 'clock', enabled: false },
    ]);
  });

  it('refuses to change a widget type or update a missing widget', async () => {
    await writeWidgets([{ id: 'clock', type: WIDGET_TYPES.CLOCK, enabled: true }]);

    const typeChange = await updateWidget('clock', { type: WIDGET_TYPES.WEATHER, location: austin, units: WEATHER_UNITS.METRIC });
    const missing = await updateWidget('nope', { type: WIDGET_TYPES.CLOCK });

    expect(typeChange.success).toBe(false);
    expect(missing).toEqual({ success: false, errors: [{ field: 'general', message: 'Widget not found' }] });
  });

  it('sets enabled state and deletes widgets', async () => {
    await writeWidgets([
      { id: 'clock', type: WIDGET_TYPES.CLOCK, enabled: true },
      { id: 'weather', type: WIDGET_TYPES.WEATHER, enabled: true, location: austin, units: WEATHER_UNITS.METRIC },
    ]);

    const disabled = await setWidgetEnabled('weather', false);
    expect(disabled.success && disabled.data.enabled).toBe(false);

    const deleted = await deleteWidget('clock');
    expect(deleted.success).toBe(true);

    expect(await readSavedConfig()).toMatchObject({
      widgets: [{ id: 'weather', enabled: false }],
    });
    expect((await deleteWidget('clock')).success).toBe(false);
  });

  it('reorders widgets only when given every widget exactly once', async () => {
    await writeWidgets([
      { id: 'clock', type: WIDGET_TYPES.CLOCK, enabled: true },
      { id: 'clock-2', type: WIDGET_TYPES.CLOCK, enabled: true },
      { id: 'weather', type: WIDGET_TYPES.WEATHER, enabled: true, location: austin, units: WEATHER_UNITS.METRIC },
    ]);

    expect((await reorderWidgets(['weather', 'clock'])).success).toBe(false);
    expect((await reorderWidgets(['weather', 'clock', 'clock'])).success).toBe(false);
    expect((await reorderWidgets(['weather', 'clock', 'unknown'])).success).toBe(false);

    const result = await reorderWidgets(['weather', 'clock-2', 'clock']);

    expect(result.success).toBe(true);
    expect((await readSavedConfig()).widgets?.map((widget) => widget.id)).toEqual(['weather', 'clock-2', 'clock']);
  });

  it('accepts widgets from the raw config editor', async () => {
    await writeConfig({ categories: [], services: [] });
    const editorState = await getConfigEditorState();
    if (!editorState.success) throw new Error('Expected editor state');

    const result = await saveConfigJson({
      raw: JSON.stringify({
        categories: [],
        services: [],
        widgets: [{ id: 'clock', type: 'clock', hourCycle: '12h' }],
      }),
      revision: editorState.data.revision,
    });

    expect(result.success).toBe(true);
    expect((await readSavedConfig()).widgets).toEqual([
      { id: 'clock', type: 'clock', hourCycle: '12h', enabled: true },
    ]);
  });

  it('validates location searches before calling Open-Meteo', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await searchWeatherLocations(' a ');

    expect(result).toEqual({ success: false, errors: [{ field: 'query', message: 'Enter at least 2 characters' }] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns a friendly error when location search is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    const result = await searchWeatherLocations('Austin');

    expect(result).toEqual({
      success: false,
      errors: [{ field: 'query', message: 'Location search is unavailable right now. Enter coordinates instead.' }],
    });
  });
});
