'use client';

import { forwardRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Kbd, ModKbd } from '@/components/ui/kbd';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar({ value, onChange }, ref) {
    const [isFocused, setIsFocused] = useState(false);
    const isExpanded = isFocused || value.length > 0;

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
          type="search"
          placeholder="Search..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
          className="pl-9 pr-3 sm:pr-16 transition-all duration-300"
        />
        <div className="absolute right-3 inset-y-0 hidden sm:flex items-center gap-1 pointer-events-none">
          {isFocused ? (
            <Kbd className="bg-accent border h-6 px-2 text-xs">Esc</Kbd>
          ) : (
            <>
              <ModKbd className="bg-accent border h-6 px-2 text-xs" />
              <Kbd className="bg-accent border h-6 px-2 text-xs">K</Kbd>
            </>
          )}
        </div>
      </div>
    );
  }
);
