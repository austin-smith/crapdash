import { Fragment } from 'react';
import type { Widget } from '@/lib/types';
import { getWidgetRenderer } from './registry';
import { WidgetAutoRefresh } from './widget-auto-refresh';

interface WidgetStripProps {
  widgets: Widget[];
}

export function WidgetStrip({ widgets }: WidgetStripProps) {
  const refreshIntervals = widgets
    .map((widget) => getWidgetRenderer(widget.type).refreshIntervalMs)
    .filter((interval): interval is number => interval !== undefined);
  const refreshIntervalMs = refreshIntervals.length > 0 ? Math.min(...refreshIntervals) : null;

  return (
    <section aria-label="Widgets" className="flex flex-wrap gap-3">
      {widgets.map((widget) => (
        <Fragment key={widget.id}>{getWidgetRenderer(widget.type).render(widget)}</Fragment>
      ))}
      {refreshIntervalMs !== null && <WidgetAutoRefresh intervalMs={refreshIntervalMs} />}
    </section>
  );
}
