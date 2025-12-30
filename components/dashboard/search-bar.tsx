'use client';

import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar({ value, onChange }, ref) {
    return (
      <div className="relative flex-1 min-w-0 sm:flex-none sm:w-auto sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        <Input
          ref={ref}
          type="search"
          placeholder="Search..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 sm:pl-10 pr-3 sm:pr-16"
        />
        <div className="absolute right-3 inset-y-0 hidden sm:flex items-center pointer-events-none">
          <Kbd className="bg-accent border h-6 px-2 text-xs">⌘K</Kbd>
        </div>
      </div>
    );
  }
);
