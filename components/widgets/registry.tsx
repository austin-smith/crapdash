import { Suspense, type ReactNode } from 'react';
import type { WidgetOfType, WidgetType } from '@/lib/types';
import { ClockWidget } from './clock-widget';
import { WeatherWidget, WeatherWidgetSkeleton } from './weather-widget';

interface WidgetRenderer<T extends WidgetType> {
  render: (widget: WidgetOfType<T>) => ReactNode;
  /** Server-rendered widgets set this so the dashboard periodically refreshes them. */
  refreshIntervalMs?: number;
}

/**
 * Dashboard renderers for each widget type. Server-data widgets should wrap themselves in
 * Suspense so a slow upstream never blocks the rest of the dashboard.
 */
export const WIDGET_RENDERERS: { [T in WidgetType]: WidgetRenderer<T> } = {
  clock: {
    render: (widget) => <ClockWidget widget={widget} />,
  },
  weather: {
    render: (widget) => (
      <Suspense fallback={<WeatherWidgetSkeleton widget={widget} />}>
        <WeatherWidget widget={widget} />
      </Suspense>
    ),
    refreshIntervalMs: 15 * 60 * 1000,
  },
};

export function getWidgetRenderer<T extends WidgetType>(type: T): WidgetRenderer<T> {
  return WIDGET_RENDERERS[type];
}
