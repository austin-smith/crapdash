'use client';

import { Button } from '@/components/ui/button';
import type { WidgetSettings, WidgetType, Widget } from '@/lib/types';

export type WidgetSettingsOfType<T extends WidgetType> = Extract<WidgetSettings, { type: T }>;

/** Props every widget type's admin form receives from the widget modal. */
export interface WidgetFormProps<T extends WidgetType> {
  widget?: Extract<Widget, { type: T }>;
  /** Field errors keyed by settings path, e.g. "timeZone" or "location.latitude". */
  errors: Record<string, string>;
  isSubmitting: boolean;
  onSubmit: (settings: WidgetSettingsOfType<T>) => void;
  onCancel: () => void;
}

interface WidgetFormFooterProps {
  isEditing: boolean;
  isSubmitting: boolean;
  generalError?: string;
  onCancel: () => void;
}

export function WidgetFormFooter({ isEditing, isSubmitting, generalError, onCancel }: WidgetFormFooterProps) {
  return (
    <>
      {generalError && <div className="text-sm text-destructive">{generalError}</div>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Widget' : 'Add Widget'}
        </Button>
      </div>
    </>
  );
}
