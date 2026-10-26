import { CornerDownLeft, Search } from 'lucide-react';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { getLinkTargetProps } from '@/lib/link-target';
import { SEARCH_BANG_PREFIX } from '@/lib/types';
import { cn } from '@/lib/utils';

interface WebSearchRowProps {
  engineName: string;
  query: string;
  url: string;
  bangTrigger?: string;
  isSelected: boolean;
  openInNewTab: boolean;
}

export function WebSearchRow({ engineName, query, url, bangTrigger, isSelected, openInNewTab }: WebSearchRowProps) {
  return (
    <a
      href={url}
      {...getLinkTargetProps(openInNewTab)}
      data-launch-selected={isSelected ? 'true' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected
          ? 'bg-accent/30 shadow-lg ring-2 ring-primary/50'
          : 'border-dashed text-muted-foreground'
      )}
    >
      {bangTrigger ? (
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground" aria-hidden="true">
          {SEARCH_BANG_PREFIX}{bangTrigger}
        </span>
      ) : (
        <Search className="size-4 shrink-0" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1 truncate">
        {query ? (
          <>Search {engineName} for <span className="font-medium text-foreground">“{query}”</span></>
        ) : (
          <>Open <span className="font-medium text-foreground">{engineName}</span></>
        )}
      </span>
      <KbdGroup className="hidden sm:inline-flex" aria-hidden="true">
        {!isSelected && <Kbd className="bg-accent border h-6 px-2 text-xs">Shift</Kbd>}
        <Kbd className="bg-accent border h-6 px-2 text-xs">
          <CornerDownLeft />
        </Kbd>
      </KbdGroup>
    </a>
  );
}
