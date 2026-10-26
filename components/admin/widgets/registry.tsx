import type { ComponentType } from 'react';
import { Clock, CloudSun, type LucideIcon } from 'lucide-react';
import { getTimeZoneLabel } from '@/lib/widgets';
import { CLOCK_HOUR_CYCLES, WEATHER_UNITS, WIDGET_TYPES, type Widget, type WidgetOfType, type WidgetType } from '@/lib/types';
import { ClockWidgetForm } from './clock-widget-form';
import { WeatherWidgetForm } from './weather-widget-form';
import type { WidgetFormProps } from './widget-form-shared';

interface WidgetAdminDefinition<T extends WidgetType> {
  label: string;
  description: string;
  icon: LucideIcon;
  /** One-line summary of the widget's settings for the admin list. */
  summarize: (widget: WidgetOfType<T>) => string;
  Form: ComponentType<WidgetFormProps<T>>;
}

/**
 * Admin metadata and settings form for each widget type. Adding a widget type requires an
 * entry here (enforced by the mapped type) alongside its dashboard renderer and schema.
 */
export const WIDGET_ADMIN_DEFINITIONS: { [T in WidgetType]: WidgetAdminDefinition<T> } = {
  clock: {
    label: 'Clock',
    description: 'Current time and date, in the viewer\'s or a fixed time zone.',
    icon: Clock,
    summarize: (widget) => [
      widget.hourCycle === CLOCK_HOUR_CYCLES.H12 ? '12-hour' : widget.hourCycle === CLOCK_HOUR_CYCLES.H24 ? '24-hour' : 'Auto format',
      widget.timeZone ? getTimeZoneLabel(widget.timeZone) : 'Local time',
      widget.showDate !== false ? 'Date' : null,
      widget.showSeconds ? 'Seconds' : null,
    ].filter(Boolean).join(' · '),
    Form: ClockWidgetForm,
  },
  weather: {
    label: 'Weather',
    description: 'Current conditions from Open-Meteo. No API key needed.',
    icon: CloudSun,
    summarize: (widget) => `${widget.location.name} · ${widget.units === WEATHER_UNITS.IMPERIAL ? '°F' : '°C'}`,
    Form: WeatherWidgetForm,
  },
};

export const WIDGET_TYPE_OPTIONS = Object.values(WIDGET_TYPES);

export function getWidgetAdminDefinition<T extends WidgetType>(type: T): WidgetAdminDefinition<T> {
  return WIDGET_ADMIN_DEFINITIONS[type];
}

export function summarizeWidget(widget: Widget): string {
  return getWidgetAdminDefinition(widget.type).summarize(widget);
}
