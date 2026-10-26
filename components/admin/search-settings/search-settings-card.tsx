'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateSearchSettings } from '@/lib/actions';
import {
  DEFAULT_SEARCH_ENGINE,
  SEARCH_ENGINES,
  SEARCH_QUERY_PLACEHOLDER,
  type SearchEngine,
  type SearchSettings,
} from '@/lib/types';
import { BUILT_IN_SEARCH_ENGINES, SEARCH_ENGINE_LABELS } from '@/lib/web-search';

const BUILT_IN_ENGINE_OPTIONS = Object.keys(BUILT_IN_SEARCH_ENGINES) as SearchEngine[];

interface SearchSettingsCardProps {
  search?: SearchSettings;
  onChange?: (search: SearchSettings) => void;
}

export function SearchSettingsCard({ search, onChange }: SearchSettingsCardProps) {
  const savedEngine = search?.engine ?? DEFAULT_SEARCH_ENGINE;
  const savedCustomUrl = search?.customUrl ?? '';
  const [engine, setEngine] = useState<SearchEngine>(savedEngine);
  const [customUrl, setCustomUrl] = useState(savedCustomUrl);
  const [customUrlError, setCustomUrlError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [prevSaved, setPrevSaved] = useState({ engine: savedEngine, customUrl: savedCustomUrl });
  const engineId = useId();
  const customUrlId = useId();

  // Sync local state when the saved engine changes (e.g. after a config import)
  if (savedEngine !== prevSaved.engine || savedCustomUrl !== prevSaved.customUrl) {
    setPrevSaved({ engine: savedEngine, customUrl: savedCustomUrl });
    setEngine(savedEngine);
    setCustomUrl(savedCustomUrl);
    setCustomUrlError(null);
  }

  const isCustom = engine === SEARCH_ENGINES.CUSTOM;
  const hasChanges = engine !== savedEngine || (isCustom && customUrl.trim() !== savedCustomUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !hasChanges) return;

    setIsSaving(true);
    setCustomUrlError(null);

    const result = await updateSearchSettings(
      isCustom ? { engine, customUrl: customUrl.trim() } : { engine }
    );

    if (!result.success) {
      const urlError = result.errors.find((error) => error.field === 'customUrl');
      if (urlError) {
        setCustomUrlError(urlError.message);
      } else {
        toast.error(result.errors[0]?.message ?? 'Failed to save search settings');
      }
      setIsSaving(false);
      return;
    }

    onChange?.(result.data);
    toast.success('Search settings saved');
    setIsSaving(false);
  };

  return (
    <Card className="shadow-xs sm:w-fit">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Field className="sm:w-48">
              <FieldLabel htmlFor={engineId}>Web search</FieldLabel>
              <Select
                value={engine}
                onValueChange={(value) => {
                  setEngine(value as SearchEngine);
                  setCustomUrlError(null);
                }}
                disabled={isSaving}
              >
                <SelectTrigger id={engineId} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUILT_IN_ENGINE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {SEARCH_ENGINE_LABELS[option]}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={SEARCH_ENGINES.CUSTOM}>
                    {SEARCH_ENGINE_LABELS[SEARCH_ENGINES.CUSTOM]}
                  </SelectItem>
                  <SelectItem value={SEARCH_ENGINES.NONE}>
                    {SEARCH_ENGINE_LABELS[SEARCH_ENGINES.NONE]}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {isCustom && (
              <Field data-invalid={!!customUrlError} className="sm:w-96">
                <FieldLabel htmlFor={customUrlId}>Search URL</FieldLabel>
                <Input
                  id={customUrlId}
                  type="url"
                  value={customUrl}
                  onChange={(e) => {
                    setCustomUrl(e.target.value);
                    setCustomUrlError(null);
                  }}
                  placeholder={`https://searx.example.com/search?q=${SEARCH_QUERY_PLACEHOLDER}`}
                  disabled={isSaving}
                  aria-invalid={!!customUrlError}
                  className="font-mono text-xs"
                />
                {customUrlError ? (
                  <FieldError>{customUrlError}</FieldError>
                ) : (
                  <FieldDescription>
                    Use <code>{SEARCH_QUERY_PLACEHOLDER}</code> where the search query goes.
                  </FieldDescription>
                )}
              </Field>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <FieldDescription>
              {engine === SEARCH_ENGINES.NONE
                ? 'Search only matches services.'
                : 'Offered when no services match. Shift+Enter searches the web anytime.'}
            </FieldDescription>
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
