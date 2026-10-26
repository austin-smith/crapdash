'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FieldDescription, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { updateSearchBangs } from '@/lib/actions';
import {
  SEARCH_BANG_PREFIX,
  SEARCH_QUERY_PLACEHOLDER,
  type SearchBang,
  type SearchSettings,
} from '@/lib/types';
import { DEFAULT_SEARCH_BANGS, getSearchBangs } from '@/lib/web-search';

type BangField = keyof SearchBang;

interface BangRow extends SearchBang {
  key: number;
}

let nextBangRowKey = 0;

function toBangRows(bangs: SearchBang[]): BangRow[] {
  return bangs.map((bang) => ({ ...bang, key: nextBangRowKey++ }));
}

function toBangs(rows: BangRow[]): SearchBang[] {
  return rows.map(({ trigger, name, url }) => ({ trigger, name, url }));
}

function getBangsKey(bangs: SearchBang[]): string {
  return JSON.stringify(bangs);
}

const DEFAULT_BANGS_KEY = getBangsKey(DEFAULT_SEARCH_BANGS);

interface SearchBangsCardProps {
  search?: SearchSettings;
  onChange?: (search: SearchSettings) => void;
}

export function SearchBangsCard({ search, onChange }: SearchBangsCardProps) {
  const savedBangs = getSearchBangs(search);
  const savedBangsKey = getBangsKey(savedBangs);
  const [rows, setRows] = useState(() => toBangRows(savedBangs));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [prevSavedBangsKey, setPrevSavedBangsKey] = useState(savedBangsKey);

  // Sync local state when the saved bangs change (e.g. after a config import)
  if (savedBangsKey !== prevSavedBangsKey) {
    setPrevSavedBangsKey(savedBangsKey);
    setRows(toBangRows(savedBangs));
    setErrors({});
  }

  const rowsKey = getBangsKey(toBangs(rows));
  const hasChanges = rowsKey !== savedBangsKey;
  const isDefault = rowsKey === DEFAULT_BANGS_KEY;

  const updateRow = (index: number, field: BangField, value: string) => {
    setRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    )));
    setErrors((current) => {
      const errorKey = `${index}.${field}`;
      if (!(errorKey in current)) return current;
      const next = { ...current };
      delete next[errorKey];
      return next;
    });
  };

  const addRow = () => {
    setRows((current) => [...current, ...toBangRows([{ trigger: '', name: '', url: '' }])]);
  };

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    // Error keys are positional, so they no longer line up after a removal
    setErrors({});
  };

  const resetToDefaults = () => {
    setRows(toBangRows(DEFAULT_SEARCH_BANGS));
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !hasChanges) return;

    setIsSaving(true);
    setErrors({});

    const result = await updateSearchBangs(toBangs(rows));

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      let generalError: string | undefined;
      for (const error of result.errors) {
        if (/^\d+\.(trigger|name|url)$/.test(error.field)) {
          fieldErrors[error.field] ??= error.message;
        } else {
          generalError ??= error.message;
        }
      }
      setErrors(fieldErrors);
      if (generalError) {
        toast.error(generalError);
      }
      setIsSaving(false);
      return;
    }

    onChange?.(result.data);
    toast.success('Bangs saved');
    setIsSaving(false);
  };

  return (
    <Card className="shadow-xs">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium">Bangs</h3>
            <FieldDescription>
              Type a bang before your search to jump straight to a site, like{' '}
              <code>{SEARCH_BANG_PREFIX}gh react</code>. A bang on its own opens the site.
            </FieldDescription>
          </div>

          {rows.length > 0 ? (
            <ul className="flex flex-col gap-3">
              <li
                className="hidden gap-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[7rem_10rem_1fr_2.25rem]"
                aria-hidden="true"
              >
                <span>Trigger</span>
                <span>Name</span>
                <span>Search URL</span>
              </li>
              {rows.map((row, index) => {
                const triggerError = errors[`${index}.trigger`];
                const nameError = errors[`${index}.name`];
                const urlError = errors[`${index}.url`];
                const rowLabel = row.name.trim() || `bang ${index + 1}`;

                return (
                  <li
                    key={row.key}
                    className="grid grid-cols-[1fr_2.25rem] gap-2 border-b pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[7rem_10rem_1fr_2.25rem] sm:border-b-0 sm:pb-0"
                  >
                    <div className="col-start-1 flex flex-col gap-1">
                      <InputGroup className="h-9">
                        <InputGroupAddon className="font-mono">{SEARCH_BANG_PREFIX}</InputGroupAddon>
                        <InputGroupInput
                          value={row.trigger}
                          onChange={(e) => updateRow(index, 'trigger', e.target.value.replace(/^!+/, ''))}
                          placeholder="gh"
                          aria-label={`Trigger for ${rowLabel}`}
                          aria-invalid={!!triggerError}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          disabled={isSaving}
                          className="font-mono text-xs"
                        />
                      </InputGroup>
                      {triggerError && <FieldError>{triggerError}</FieldError>}
                    </div>
                    <div className="col-start-1 flex flex-col gap-1 sm:col-start-auto">
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(index, 'name', e.target.value)}
                        placeholder="GitHub"
                        aria-label={`Name for ${rowLabel}`}
                        aria-invalid={!!nameError}
                        disabled={isSaving}
                        className="h-9"
                      />
                      {nameError && <FieldError>{nameError}</FieldError>}
                    </div>
                    <div className="col-start-1 flex flex-col gap-1 sm:col-start-auto">
                      <Input
                        type="url"
                        value={row.url}
                        onChange={(e) => updateRow(index, 'url', e.target.value)}
                        placeholder={`https://github.com/search?q=${SEARCH_QUERY_PLACEHOLDER}`}
                        aria-label={`Search URL for ${rowLabel}`}
                        aria-invalid={!!urlError}
                        disabled={isSaving}
                        className="h-9 font-mono text-xs"
                      />
                      {urlError && <FieldError>{urlError}</FieldError>}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(index)}
                          disabled={isSaving}
                          aria-label={`Remove ${rowLabel}`}
                          className="col-start-2 row-start-1 size-9 text-muted-foreground sm:col-start-auto sm:row-start-auto"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove</TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No bangs. Bang shortcuts are off.</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={addRow} disabled={isSaving} className="h-9">
                <Plus className="size-4" />
                Add bang
              </Button>
              {!isDefault && (
                <Button type="button" variant="ghost" onClick={resetToDefaults} disabled={isSaving} className="h-9">
                  Reset to defaults
                </Button>
              )}
            </div>
            {hasChanges && (
              <Button type="submit" disabled={isSaving} className="h-9">
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
