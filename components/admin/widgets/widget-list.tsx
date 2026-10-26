'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SortableItem, SortableList } from '@/components/ui/sortable';
import { Switch } from '@/components/ui/switch';
import { deleteWidget, reorderWidgets, setWidgetEnabled } from '@/lib/actions';
import { cn } from '@/lib/utils';
import type { Widget } from '@/lib/types';
import { DeleteConfirmDialog } from '../delete-confirm-dialog';
import { getWidgetAdminDefinition, summarizeWidget } from './registry';

interface WidgetListProps {
  widgets: Widget[];
  onWidgetsChange: (widgets: Widget[]) => void;
  onEdit: (widget: Widget) => void;
}

export function WidgetList({ widgets, onWidgetsChange, onEdit }: WidgetListProps) {
  const [widgetToDelete, setWidgetToDelete] = useState<Widget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleReorder = async (reordered: Widget[]) => {
    const previous = widgets;
    onWidgetsChange(reordered);

    const result = await reorderWidgets(reordered.map((widget) => widget.id));
    if (!result.success) {
      onWidgetsChange(previous);
      toast.error(result.errors[0]?.message ?? 'Failed to save widget order');
    }
  };

  const handleEnabledChange = async (widget: Widget, enabled: boolean) => {
    const previous = widgets;
    onWidgetsChange(widgets.map((item) => (item.id === widget.id ? { ...item, enabled } : item)));

    const result = await setWidgetEnabled(widget.id, enabled);
    if (!result.success) {
      onWidgetsChange(previous);
      toast.error(result.errors[0]?.message ?? 'Failed to update widget');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!widgetToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteWidget(widgetToDelete.id);
    if (result.success) {
      toast.success('Widget deleted');
      onWidgetsChange(widgets.filter((widget) => widget.id !== widgetToDelete.id));
      setWidgetToDelete(null);
    } else {
      setDeleteError(result.errors[0]?.message ?? 'Failed to delete widget');
    }

    setIsDeleting(false);
  };

  const renderWidgetCard = (widget: Widget, isOverlay = false) => {
    const { label, icon: Icon } = getWidgetAdminDefinition(widget.type);

    return (
      <Card className={cn(isOverlay && 'shadow-lg ring-2 ring-primary/20')}>
        <CardHeader>
          <div className={cn('flex min-w-0 items-center gap-3 transition-opacity', !widget.enabled && 'opacity-50')}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg">{label}</CardTitle>
              <CardDescription className="truncate">{summarizeWidget(widget)}</CardDescription>
            </div>
          </div>
          <CardAction>
            <Switch
              checked={widget.enabled}
              onCheckedChange={(enabled) => void handleEnabledChange(widget, enabled)}
              aria-label={widget.enabled ? `Hide ${label} widget` : `Show ${label} widget`}
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(widget)} className="flex-1">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteError(null);
                setWidgetToDelete(widget);
              }}
              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <SortableList
        items={widgets}
        getItemId={(widget) => widget.id}
        onReorder={(reordered) => void handleReorder(reordered)}
        strategy="grid"
        renderOverlay={(widget) => <div className="w-full max-w-sm">{renderWidgetCard(widget, true)}</div>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {widgets.map((widget, index) => (
            <SortableItem
              key={widget.id}
              id={widget.id}
              className="animate-card-in"
              style={{ '--index': index } as CSSProperties}
            >
              {renderWidgetCard(widget)}
            </SortableItem>
          ))}
        </div>
      </SortableList>

      <DeleteConfirmDialog
        open={widgetToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setWidgetToDelete(null);
            setDeleteError(null);
          }
        }}
        itemName={widgetToDelete ? `${getWidgetAdminDefinition(widgetToDelete.type).label} (${summarizeWidget(widgetToDelete)})` : ''}
        itemType="widget"
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </>
  );
}
