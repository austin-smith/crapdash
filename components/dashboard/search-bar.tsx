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
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={ref}
          type="search"
          placeholder="Search services..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-16"
        />
        <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none">
          <Kbd className="bg-accent border h-6 px-2 text-xs">⌘K</Kbd>
        </div>
      </div>
    );
  }
);
