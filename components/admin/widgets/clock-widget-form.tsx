'use client';

import { useState } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CLOCK_HOUR_CYCLES, WIDGET_TYPES, type ClockHourCycle } from '@/lib/types';
import { TimeZonePicker } from './time-zone-picker';
import { WidgetFormFooter, type WidgetFormProps } from './widget-form-shared';

const AUTO_HOUR_CYCLE = 'auto';

const HOUR_CYCLE_OPTIONS = [
  { value: AUTO_HOUR_CYCLE, label: 'Auto' },
  { value: CLOCK_HOUR_CYCLES.H12, label: '12-hour' },
  { value: CLOCK_HOUR_CYCLES.H24, label: '24-hour' },
] as const;

export function ClockWidgetForm({ widget, errors, isSubmitting, onSubmit, onCancel }: WidgetFormProps<typeof WIDGET_TYPES.CLOCK>) {
  const [hourCycle, setHourCycle] = useState<ClockHourCycle | typeof AUTO_HOUR_CYCLE>(widget?.hourCycle ?? AUTO_HOUR_CYCLE);
  const [timeZone, setTimeZone] = useState(widget?.timeZone ?? '');
  const [showDate, setShowDate] = useState(widget?.showDate ?? true);
  const [showSeconds, setShowSeconds] = useState(widget?.showSeconds ?? false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      type: WIDGET_TYPES.CLOCK,
      ...(hourCycle !== AUTO_HOUR_CYCLE && { hourCycle }),
      ...(timeZone && { timeZone }),
      showDate,
      showSeconds,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field data-invalid={!!errors.hourCycle}>
        <FieldLabel>Hour format</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          value={hourCycle}
          onValueChange={(value) => value && setHourCycle(value as typeof hourCycle)}
          className="grid w-full grid-cols-3"
          disabled={isSubmitting}
        >
          {HOUR_CYCLE_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>Auto follows the viewer&apos;s locale.</FieldDescription>
        {errors.hourCycle && <FieldError>{errors.hourCycle}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.timeZone}>
        <FieldLabel htmlFor="clock-time-zone">Time zone</FieldLabel>
        <TimeZonePicker id="clock-time-zone" value={timeZone} onChange={setTimeZone} disabled={isSubmitting} />
        {errors.timeZone && <FieldError>{errors.timeZone}</FieldError>}
      </Field>

      <div className="divide-y rounded-lg border">
        <div className="flex items-center justify-between p-4">
          <Label htmlFor="clock-show-date">Show date</Label>
          <Switch id="clock-show-date" checked={showDate} onCheckedChange={setShowDate} disabled={isSubmitting} />
        </div>
        <div className="flex items-center justify-between p-4">
          <Label htmlFor="clock-show-seconds">Show seconds</Label>
          <Switch id="clock-show-seconds" checked={showSeconds} onCheckedChange={setShowSeconds} disabled={isSubmitting} />
        </div>
      </div>

      <WidgetFormFooter
        isEditing={!!widget}
        isSubmitting={isSubmitting}
        generalError={errors.general}
        onCancel={onCancel}
      />
    </form>
  );
}
