import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudOff,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getWeather, type WeatherCondition } from '@/lib/weather';
import { WEATHER_UNITS, type WeatherWidgetSettings } from '@/lib/types';
import { WidgetCard } from './widget-card';

const CONDITION_ICONS: Record<WeatherCondition, { day: LucideIcon; night: LucideIcon }> = {
  clear: { day: Sun, night: Moon },
  'partly-cloudy': { day: CloudSun, night: CloudMoon },
  cloudy: { day: Cloud, night: Cloud },
  fog: { day: CloudFog, night: CloudFog },
  drizzle: { day: CloudDrizzle, night: CloudDrizzle },
  rain: { day: CloudRain, night: CloudRain },
  'freezing-rain': { day: CloudHail, night: CloudHail },
  snow: { day: CloudSnow, night: CloudSnow },
  thunderstorm: { day: CloudLightning, night: CloudLightning },
  unknown: { day: Cloud, night: Cloud },
};

function formatTemperature(value: number): string {
  return `${Math.round(value)}°`;
}

function formatAge(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

interface WeatherWidgetProps {
  widget: WeatherWidgetSettings;
}

export async function WeatherWidget({ widget }: WeatherWidgetProps) {
  const { location, units } = widget;
  const result = await getWeather(location, units);

  if (result.status === 'unavailable') {
    return (
      <WidgetCard label={`Weather, ${location.name}`}>
        <CloudOff className="size-7 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium text-muted-foreground">Weather unavailable</span>
          <span className="truncate text-xs text-muted-foreground">{location.name}</span>
        </div>
      </WidgetCard>
    );
  }

  const { conditions, stale, ageMs } = result;
  const Icon = CONDITION_ICONS[conditions.condition][conditions.isDay ? 'day' : 'night'];
  const unitLabel = units === WEATHER_UNITS.IMPERIAL ? 'F' : 'C';
  const range = conditions.high !== null && conditions.low !== null
    ? `H ${formatTemperature(conditions.high)} L ${formatTemperature(conditions.low)}`
    : null;
  const staleLabel = stale ? `Offline · updated ${formatAge(ageMs)} ago` : null;

  return (
    <WidgetCard
      label={`Weather, ${location.name}`}
      title={`Feels like ${formatTemperature(conditions.apparentTemperature)}${unitLabel}${staleLabel ? ` · ${staleLabel}` : ''}`}
    >
      <Icon className="size-7 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-col">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl/tight font-semibold tabular-nums tracking-tight">
            {formatTemperature(conditions.temperature)}
            <span className="sr-only">{unitLabel}</span>
          </span>
          <span className="truncate text-xs font-medium">{conditions.description}</span>
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {[location.name, staleLabel ?? range].filter(Boolean).join(' · ')}
        </span>
      </div>
    </WidgetCard>
  );
}

export function WeatherWidgetSkeleton({ widget }: WeatherWidgetProps) {
  return (
    <WidgetCard label={`Weather, ${widget.location.name}`} aria-busy>
      <Skeleton className="size-7 shrink-0 rounded-full" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </WidgetCard>
  );
}
