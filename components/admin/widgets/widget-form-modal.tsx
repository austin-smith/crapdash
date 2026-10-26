'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createWidget, updateWidget } from '@/lib/actions';
import type { Widget, WidgetSettings, WidgetType } from '@/lib/types';
import { getWidgetAdminDefinition } from './registry';
import type { WidgetFormProps } from './widget-form-shared';

interface WidgetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: WidgetType;
  /** Present when editing an existing widget. */
  widget?: Widget;
  onSaved: (widget: Widget) => void;
}

export function WidgetFormModal({ open, onOpenChange, type, widget, onSaved }: WidgetFormModalProps) {
  const definition = getWidgetAdminDefinition(type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Weather search results can make this taller than short viewports, so let it scroll. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{widget ? `Edit ${definition.label} Widget` : `Add ${definition.label} Widget`}</DialogTitle>
          <DialogDescription>{definition.description}</DialogDescription>
        </DialogHeader>
        {/* Rendered inside DialogContent so form state resets each time the dialog opens. */}
        <WidgetFormBody
          type={type}
          widget={widget}
          onSaved={(saved) => {
            onSaved(saved);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface WidgetFormBodyProps {
  type: WidgetType;
  widget?: Widget;
  onSaved: (widget: Widget) => void;
  onCancel: () => void;
}

function WidgetFormBody({ type, widget, onSaved, onCancel }: WidgetFormBodyProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Each registry form is typed to its own widget type; `type` ties them together at runtime.
  const Form = getWidgetAdminDefinition(type).Form as ComponentType<WidgetFormProps<WidgetType>>;

  const handleSubmit = async (settings: WidgetSettings) => {
    setIsSubmitting(true);
    setErrors({});

    const result = widget ? await updateWidget(widget.id, settings) : await createWidget(settings);

    if (result.success) {
      toast.success(widget ? 'Widget updated' : 'Widget added');
      onSaved(result.data);
    } else {
      setErrors(Object.fromEntries(result.errors.map((error) => [error.field, error.message])));
    }

    setIsSubmitting(false);
  };

  return (
    <Form
      widget={widget}
      errors={errors}
      isSubmitting={isSubmitting}
      onSubmit={(settings) => void handleSubmit(settings)}
      onCancel={onCancel}
    />
  );
}
