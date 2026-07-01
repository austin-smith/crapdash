'use client';

import { forwardRef, useId, useState } from 'react';
import type { KeyboardEventHandler } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Kbd, ModKbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  assistiveText?: string;
  ariaLabel?: string;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar({
    value,
    onChange,
    onKeyDown,
    assistiveText,
    ariaLabel = 'Search',
  }, ref) {
    const [isFocused, setIsFocused] = useState(false);
    const isExpanded = isFocused || value.length > 0;
    const hasValue = value.length > 0;
    const showEscHint = isFocused;
    const assistiveTextId = useId();
    let inputRightPadding = 'pr-3 sm:pr-16';

    if (hasValue && showEscHint) {
      inputRightPadding = 'pr-24';
    } else if (hasValue) {
      inputRightPadding = 'pr-12';
    } else if (showEscHint) {
      inputRightPadding = 'pr-16';
    }

    return (
      <div
        className={cn(
          'relative w-full transition-all duration-300 ease-out',
          isExpanded ? 'md:w-80' : 'md:w-48'
        )}
      >
        <Search
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200',
            isExpanded ? 'text-foreground' : 'text-muted-foreground'
          )}
        />
        <Input
          ref={ref}
          type="text"
          role="searchbox"
          placeholder="Search..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label={ariaLabel}
          aria-describedby={assistiveText ? assistiveTextId : undefined}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (e.defaultPrevented) return;

            if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
          className={cn(
            'pl-9 transition-all duration-300',
            inputRightPadding
          )}
        />
        <div className="absolute right-3 inset-y-0 flex items-center gap-1 pointer-events-none">
          {hasValue && (
            <button
              type="button"
              aria-label="Clear search"
              title="Clear search"
              className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange('')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {showEscHint && (
            <Kbd className="bg-accent border h-6 px-2 text-xs">Esc</Kbd>
          )}
          {!showEscHint && !hasValue ? (
            <span className="hidden sm:flex items-center gap-1">
              <ModKbd className="bg-accent border h-6 px-2 text-xs" />
              <Kbd className="bg-accent border h-6 px-2 text-xs">K</Kbd>
            </span>
          ) : null}
        </div>
        {assistiveText && (
          <span id={assistiveTextId} className="sr-only" aria-live="polite">
            {assistiveText}
          </span>
        )}
      </div>
    );
  }
);
