'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimateIcon } from '@/components/ui/animated-icons/animate-icon';
import { BrushCleaningIcon } from '@/components/ui/animated-icons/brush-cleaning';
import { DownloadIcon } from '@/components/ui/animated-icons/download';
import { FilePenLineIcon } from '@/components/ui/animated-icons/file-pen-line';
import { RefreshCWIcon } from '@/components/ui/animated-icons/refresh-cw';
import { CodeEditor } from '@/components/admin/config-editor/code-editor';
import { getConfigEditorState, saveConfigJson } from '@/lib/actions';
import { getConfigExportFilename } from '@/lib/utils';
import type { DashboardConfig, ImportWarning, ValidationError } from '@/lib/types';

interface ConfigEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (config: DashboardConfig) => void;
}

function formatJson(raw: string): string {
  return JSON.stringify(JSON.parse(raw), null, 2);
}

function downloadConfig(raw: string) {
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getConfigExportFilename();
  link.click();
  URL.revokeObjectURL(url);
}

function getJsonParseError(raw: string): string | null {
  if (!raw.trim()) return 'Configuration cannot be empty';

  try {
    JSON.parse(raw);
    return null;
  } catch (error) {
    return error instanceof SyntaxError ? error.message : 'Invalid JSON';
  }
}

export function ConfigEditorDialog({ open, onOpenChange, onSaved }: ConfigEditorDialogProps) {
  const [raw, setRaw] = useState('');
  const [revision, setRevision] = useState<string>();
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<ImportWarning[]>([]);
  const [hasRevisionConflict, setHasRevisionConflict] = useState(false);
  const [isPending, startTransition] = useTransition();

  const parseError = useMemo(() => getJsonParseError(raw), [raw]);

  const loadConfig = () => {
    startTransition(async () => {
      setErrors([]);
      setWarnings([]);
      setHasRevisionConflict(false);

      const result = await getConfigEditorState();

      if (!result.success) {
        toast.error(result.errors[0]?.message ?? 'Failed to load configuration');
        return;
      }

      setRaw(result.data.raw);
      setRevision(result.data.revision);
    });
  };

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handleFormat = () => {
    try {
      setRaw(formatJson(raw));
      setErrors([]);
    } catch (error) {
      setErrors([{
        field: 'config',
        message: error instanceof SyntaxError ? error.message : 'Invalid JSON',
      }]);
    }
  };

  const handleSave = (force = false) => {
    if (parseError) {
      setErrors([{ field: 'config', message: parseError }]);
      return;
    }

    setErrors([]);
    setHasRevisionConflict(false);

    startTransition(async () => {
      const result = await saveConfigJson({ raw, revision, force });

      if (!result.success) {
        setErrors(result.errors);
        setHasRevisionConflict(result.errors.some((error) => error.field === 'revision'));
        toast.error(result.errors[0]?.message ?? 'Failed to save configuration');
        return;
      }

      const nextRaw = formatJson(JSON.stringify(result.data.config));

      setRaw(nextRaw);
      setRevision(result.data.revision);
      setWarnings(result.data.warnings);
      setHasRevisionConflict(false);
      onSaved(result.data.config);
      toast.success('Configuration saved');

      if (result.data.warnings.length > 0) {
        toast.warning(`Saved with ${result.data.warnings.length} warning(s)`);
      }
    });
  };

  const visibleErrors = parseError && errors.length === 0
    ? [{ field: 'config', message: parseError }]
    : errors;
  const hasStatusMessages = visibleErrors.length > 0 || warnings.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="h-[min(90vh,840px)] max-w-[min(96vw,1240px)] grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-0 p-0 sm:max-w-[min(96vw,1240px)]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <FilePenLineIcon size={16} />
                <span>Edit Config</span>
                <span className="font-mono text-xs font-normal text-muted-foreground">config.json</span>
              </DialogTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {warnings.length > 0 && <Badge variant="destructive">{warnings.length} warning(s)</Badge>}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 px-4 py-3">
          <div className="relative h-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <CopyButton
                  value={raw}
                  variant="outline"
                  size="icon"
                  copiedLabel="Copied"
                  copyLabel="Copy"
                  errorMessage="Failed to copy configuration"
                  disabled={!raw}
                  iconOnly
                  aria-label="Copy JSON"
                  className="absolute right-2 top-2 z-10 bg-background/95 shadow-sm backdrop-blur"
                />
              </TooltipTrigger>
              <TooltipContent side="left">Copy JSON</TooltipContent>
            </Tooltip>
            <CodeEditor value={raw} onChange={setRaw} readOnly={isPending} />
          </div>
        </div>

        {hasStatusMessages && (
          <div className="max-h-32 space-y-2 overflow-auto border-t border-border px-4 py-2">
            {visibleErrors.map((error, index) => (
              <div key={`${error.field}-${index}`} className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <div>
                  <span className="font-medium">{error.field || 'general'}: </span>
                  {error.message}
                </div>
              </div>
            ))}
            {warnings.map((warning, index) => (
              <div key={`${warning.field}-${index}`} className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
                <div>
                  <span className="font-medium text-amber-700 dark:text-amber-300">{warning.field}: </span>
                  <span className="text-muted-foreground">{warning.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="items-center border-t border-border px-4 py-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <AnimateIcon animateOnHover asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleFormat}
                      disabled={isPending || !raw}
                      aria-label="Format"
                    >
                      <BrushCleaningIcon size={16} aria-hidden="true" />
                    </Button>
                  </AnimateIcon>
                </TooltipTrigger>
                <TooltipContent side="top">Format JSON</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AnimateIcon animateOnHover asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={loadConfig}
                      disabled={isPending}
                      aria-label="Reload"
                    >
                      <RefreshCWIcon size={16} aria-hidden="true" />
                    </Button>
                  </AnimateIcon>
                </TooltipTrigger>
                <TooltipContent side="top">Reload</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AnimateIcon animateOnHover asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => downloadConfig(raw)}
                      disabled={!raw}
                      aria-label="Download"
                    >
                      <DownloadIcon size={16} aria-hidden="true" />
                    </Button>
                  </AnimateIcon>
                </TooltipTrigger>
                <TooltipContent side="top">Download</TooltipContent>
              </Tooltip>
            </div>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Close
            </Button>
            {hasRevisionConflict && (
              <Button type="button" variant="destructive" onClick={() => handleSave(true)} disabled={isPending}>
                Force Replace
              </Button>
            )}
            <Button type="button" onClick={() => handleSave(false)} disabled={isPending || !!parseError}>
              {isPending ? 'Working...' : 'Save Config'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
