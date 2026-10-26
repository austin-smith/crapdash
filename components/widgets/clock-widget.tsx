'use client';

import { useMemo } from 'react';
import { useNow } from '@/hooks/use-now';
import { getTimeZoneLabel } from '@/lib/widgets';
import { CLOCK_HOUR_CYCLES, type ClockWidgetSettings } from '@/lib/types';
import { WidgetCard } from './widget-card';

function createFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(undefined, options);
  } catch {
    // The browser may not know a zone the server accepted; fall back to local time.
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone: undefined });
  }
}

interface ClockWidgetProps {
  widget: ClockWidgetSettings;
}

export function ClockWidget({ widget }: ClockWidgetProps) {
  const { hourCycle, timeZone, showSeconds = false, showDate = true } = widget;
  const now = useNow(showSeconds ? 1000 : 60_000);

  const timeFormatter = useMemo(() => createFormatter({
    hour: hourCycle === CLOCK_HOUR_CYCLES.H24 ? '2-digit' : 'numeric',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hourCycle: hourCycle ? (hourCycle === CLOCK_HOUR_CYCLES.H24 ? 'h23' : 'h12') : undefined,
    timeZone,
  }), [hourCycle, showSeconds, timeZone]);

  const dateFormatter = useMemo(() => createFormatter({
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone,
  }), [timeZone]);

  const timeParts = now === null ? [] : timeFormatter.formatToParts(now);
  const time = timeParts.filter((part) => part.type !== 'dayPeriod').map((part) => part.value).join('').trim();
  const dayPeriod = timeParts.find((part) => part.type === 'dayPeriod')?.value;

  const caption = [
    showDate && now !== null ? dateFormatter.format(now) : null,
    timeZone ? getTimeZoneLabel(timeZone) : null,
  ].filter(Boolean).join(' · ');
  const hasCaption = showDate || !!timeZone;

  return (
    <WidgetCard label={timeZone ? `Clock, ${getTimeZoneLabel(timeZone)}` : 'Clock'}>
      <div className="flex min-w-0 flex-col">
        {now === null ? (
          // Server/hydration placeholder with matching dimensions; real time renders on the client.
          <div aria-hidden className="invisible flex flex-col">
            <span className="font-mono text-2xl/tight font-semibold">00:00</span>
            {hasCaption && <span className="text-xs">Wednesday, September 30</span>}
          </div>
        ) : (
          <>
            <time
              dateTime={new Date(now).toISOString()}
              className="font-mono text-2xl/tight font-semibold tabular-nums tracking-tight"
            >
              {time}
              {dayPeriod && (
                <span className="ml-1 text-xs font-medium text-muted-foreground">{dayPeriod}</span>
              )}
            </time>
            {caption && <span className="truncate text-xs text-muted-foreground">{caption}</span>}
          </>
        )}
      </div>
    </WidgetCard>
  );
}
