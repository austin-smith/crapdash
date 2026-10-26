'use client';

import { useEffect, useEffectEvent, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimateIcon } from '@/components/ui/animated-icons/animate-icon';
import { HistoryIcon } from '@/components/ui/animated-icons/history';
import { RefreshCWIcon } from '@/components/ui/animated-icons/refresh-cw';
import { CodeEditor } from '@/components/admin/config-editor/code-editor';
import { getConfigHistory, getConfigSnapshot, restoreConfigSnapshot } from '@/lib/actions';
import { formatConfigChangeSummary } from '@/lib/config-diff';
import { cn } from '@/lib/utils';
import {
  CONFIG_SNAPSHOT_REASONS,
  CONFIG_SNAPSHOT_STATUSES,
  type ConfigHistory,
  type ConfigHistoryEntry,
  type ConfigSnapshotReason,
  type DashboardConfig,
  type ValidationError,
} from '@/lib/types';

interface ConfigHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: (config: DashboardConfig) => void;
}

const REASON_LABELS: Record<ConfigSnapshotReason, string> = {
  [CONFIG_SNAPSHOT_REASONS.EDIT]: 'Before edit',
  [CONFIG_SNAPSHOT_REASONS.REORDER]: 'Before reorder',
  [CONFIG_SNAPSHOT_REASONS.IMPORT]: 'Before import',
  [CONFIG_SNAPSHOT_REASONS.EDITOR]: 'Before config editor save',
  [CONFIG_SNAPSHOT_REASONS.RESTORE]: 'Before restore',
};

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

function getSummaryText(entry: ConfigHistoryEntry): string {
  if (entry.status === CONFIG_SNAPSHOT_STATUSES.UNREADABLE) return 'Unreadable file, can’t be restored';
  if (entry.status === CONFIG_SNAPSHOT_STATUSES.INVALID) return 'Invalid config, can’t be restored';
  if (!entry.summary) return 'Changes unavailable';

  const parts = formatConfigChangeSummary(entry.summary);
  return parts.length > 0 ? parts.join(', ') : 'Same as current';
}

export function ConfigHistoryDialog({ open, onOpenChange, onRestored }: ConfigHistoryDialogProps) {
  const [history, setHistory] = useState<ConfigHistory | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; raw: string } | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedEntry = history?.snapshots.find((entry) => entry.id === selectedId);

  const refreshHistory = async () => {
    const result = await getConfigHistory();

    if (!result.success) {
      toast.error(result.errors[0]?.message ?? 'Failed to load history');
      return;
    }

    setHistory(result.data);
    setSelectedId((current) =>
      result.data.snapshots.some((entry) => entry.id === current)
        ? current
        : result.data.snapshots[0]?.id ?? null
    );
  };

  const loadHistory = () => {
    startTransition(async () => {
      setErrors([]);
      await refreshHistory();
    });
  };

  const onOpened = useEffectEvent(loadHistory);

  useEffect(() => {
    if (open) {
      onOpened();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !selectedId || preview?.id === selectedId) return;

    let cancelled = false;

    getConfigSnapshot(selectedId).then((result) => {
      if (cancelled) return;

      if (!result.success) {
        toast.error(result.errors[0]?.message ?? 'Failed to load snapshot');
        return;
      }

      setPreview({ id: result.data.id, raw: result.data.raw });
    });

    return () => {
      cancelled = true;
    };
  }, [open, selectedId, preview?.id]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setErrors([]);
  };

  const handleRestore = () => {
    if (!history || !selectedEntry) return;

    startTransition(async () => {
      const result = await restoreConfigSnapshot({ id: selectedEntry.id, revision: history.revision });
      setConfirmOpen(false);

      if (!result.success) {
        setErrors(result.errors);
        toast.error(result.errors[0]?.message ?? 'Failed to restore snapshot');

        if (result.errors.some((error) => error.field === 'revision')) {
          await refreshHistory();
        }
        return;
      }

      setErrors([]);
      onRestored(result.data.config);
      toast.success('Snapshot restored. The replaced config was saved to history.');

      const warningCount = result.data.warnings.length;
      if (warningCount > 0) {
        const firstWarning = result.data.warnings[0]?.message;
        toast.warning(
          warningCount === 1
            ? `Restored with 1 warning: ${firstWarning}`
            : `Restored with ${warningCount} warnings. First warning: ${firstWarning}`
        );
      }

      await refreshHistory();
    });
  };

  const snapshots = history?.snapshots ?? [];
  const previewRaw = preview && preview.id === selectedId ? preview.raw : '';
  const canRestore = selectedEntry?.status === CONFIG_SNAPSHOT_STATUSES.VALID && !isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="h-[min(90vh,840px)] max-w-[min(96vw,1240px)] grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-0 p-0 sm:max-w-[min(96vw,1240px)]"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader className="border-b border-border px-4 py-3">
            <div className="space-y-1 pr-8">
              <DialogTitle className="flex items-center gap-2">
                <HistoryIcon size={16} />
                <span>Config History</span>
                <span className="font-mono text-xs font-normal text-muted-foreground">data/backups</span>
              </DialogTitle>
              <DialogDescription>
                {history?.limit === 0
                  ? 'Snapshots are disabled (CRAPDASH_SNAPSHOT_LIMIT=0).'
                  : `A snapshot is saved before each config change. The ${history?.limit ?? ''} most recent are kept. Changes are relative to the current config.`}
              </DialogDescription>
            </div>
          </DialogHeader>

          {snapshots.length === 0 ? (
            <div className="flex min-h-0 items-center justify-center px-4 py-3">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>
                    <HistoryIcon size={40} className="text-primary" />
                  </EmptyMedia>
                  <EmptyTitle>{isPending && !history ? 'Loading history...' : 'No snapshots yet'}</EmptyTitle>
                  <EmptyDescription>Snapshots appear here after the config is changed.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="grid min-h-0 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:grid-rows-1">
              <ul className="min-h-0 overflow-auto border-b border-border p-2 md:border-r md:border-b-0" aria-label="Snapshots">
                {snapshots.map((entry) => {
                  const isSelected = entry.id === selectedId;
                  const isRestorable = entry.status === CONFIG_SNAPSHOT_STATUSES.VALID;

                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(entry.id)}
                        aria-current={isSelected}
                        className={cn(
                          'w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/60',
                          isSelected && 'bg-muted'
                        )}
                      >
                        <div className="text-sm font-medium">{REASON_LABELS[entry.reason]}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {timestampFormatter.format(new Date(entry.createdAt))}
                        </div>
                        <div className={cn('mt-1 text-xs', isRestorable ? 'text-foreground/80' : 'text-destructive')}>
                          {getSummaryText(entry)}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="min-h-0 px-4 py-3">
                <CodeEditor value={previewRaw} readOnly />
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="max-h-32 space-y-2 overflow-auto border-t border-border px-4 py-2">
              {errors.map((error, index) => (
                <div key={`${error.field}-${index}`} className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <div>
                    <span className="font-medium">{error.field || 'general'}: </span>
                    {error.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="items-center border-t border-border px-4 py-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <AnimateIcon animateOnHover asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={loadHistory}
                      disabled={isPending}
                      aria-label="Reload"
                    >
                      <RefreshCWIcon size={16} aria-hidden="true" />
                    </Button>
                  </AnimateIcon>
                </TooltipTrigger>
                <TooltipContent side="top">Reload</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="mx-1 h-6" />
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Close
              </Button>
              <Button type="button" onClick={() => setConfirmOpen(true)} disabled={!canRestore}>
                {isPending ? 'Working...' : 'Restore'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={(nextOpen) => !isPending && setConfirmOpen(nextOpen)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the current configuration with the selected snapshot. The current
              configuration is saved to history first, so you can undo this.
              {selectedEntry && (
                <span className="mt-2 block font-mono text-xs text-foreground/80">
                  {REASON_LABELS[selectedEntry.reason]} · {timestampFormatter.format(new Date(selectedEntry.createdAt))}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleRestore();
              }}
              disabled={!canRestore}
            >
              {isPending ? 'Restoring...' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
