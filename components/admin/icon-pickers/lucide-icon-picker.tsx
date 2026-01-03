'use client';

import { useState, useMemo } from 'react';
import { ChevronsUpDown, ExternalLink, Ban, Hexagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CategoryIcon } from '@/components/common/icons/category-icon';
import { getLucideIconNames, isValidLucideIconName, resolveLucideIconName } from '@/lib/lucide-icons';
import { ICON_TYPES } from '@/lib/types';

interface LucideIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const PAGE_SIZE = 60;

export function LucideIconPicker({
  value,
  onChange,
  disabled,
}: LucideIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const allIcons = useMemo(() => getLucideIconNames(), []);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) {
      return allIcons.slice(0, limit);
    }
    
    const query = search.toLowerCase();
    const matches = allIcons.filter(name => 
      name.toLowerCase().includes(query)
    );
    
    // Sort: prioritize names that start with the search term
    matches.sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(query);
      const bStarts = b.toLowerCase().startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    });
    
    return matches.slice(0, limit);
  }, [search, allIcons, limit]);

  const totalMatches = useMemo(() => {
    if (!search.trim()) return allIcons.length;
    const query = search.toLowerCase();
    return allIcons.filter(name => name.toLowerCase().includes(query)).length;
  }, [search, allIcons]);

  const hasMore = filteredIcons.length < totalMatches;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setLimit(PAGE_SIZE);
  };

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
  };

  const resolvedValue = value ? resolveLucideIconName(value) : null;
  const isValid = value ? isValidLucideIconName(value) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
            {resolvedValue ? (
              <CategoryIcon icon={{ type: ICON_TYPES.ICON, value: resolvedValue }} className="h-8 w-8" />
            ) : (
              <Hexagon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
                disabled={disabled}
              >
                {resolvedValue ? (
                  <span className="flex items-center gap-2">
                    <CategoryIcon icon={{ type: ICON_TYPES.ICON, value: resolvedValue }} className="h-4 w-4" />
                    <span className="font-mono text-xs">{resolvedValue}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select icon...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-0 overflow-hidden max-h-[calc(100vh-8rem)] min-h-0"
              align="start"
              side="top"
              sideOffset={4}
              collisionPadding={8}
              avoidCollisions={false}
            >
              <Command
                filter={() => 1}
                className="flex max-h-[calc(100vh-8rem)] min-h-0 flex-col"
              >
                <CommandInput
                  placeholder="Search icons..."
                  value={search}
                  onValueChange={handleSearchChange}
                />
                <CommandList
                  className="flex-1 min-h-0 overflow-y-auto p-2"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <CommandEmpty>No icons found</CommandEmpty>
                  <CommandGroup className="p-0">
                    <TooltipProvider delayDuration={300}>
                      <div className="grid grid-cols-6 gap-1">
                        {/* None option */}
                        {!search && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => { handleClear(); setOpen(false); }}
                                className="flex items-center justify-center aspect-square rounded-md cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-accent transition-colors text-muted-foreground/50 hover:text-muted-foreground"
                              >
                                <Ban className="size-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[10px] px-2 py-1">
                              Remove icon
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {filteredIcons.map((iconName) => (
                          <CommandItem
                            key={iconName}
                            value={iconName}
                            onSelect={handleSelect}
                            data-checked={value === iconName}
                            className="!flex !items-center !justify-center !p-0 aspect-square rounded-md cursor-pointer bg-muted/40 hover:bg-accent hover:text-accent-foreground transition-colors [&>svg:last-child]:hidden"
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center justify-center w-full h-full">
                                  <CategoryIcon icon={{ type: ICON_TYPES.ICON, value: iconName }} className="size-5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="font-mono text-[10px] px-2 py-1">
                                {iconName}
                              </TooltipContent>
                            </Tooltip>
                          </CommandItem>
                        ))}
                      </div>
                    </TooltipProvider>
                  </CommandGroup>
                </CommandList>
                <div className="px-3 py-2 border-t space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>
                      Showing {filteredIcons.length} of {totalMatches} icons
                    </span>
                    {hasMore && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground underline underline-offset-2"
                        onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
                      >
                        Load more
                      </button>
                    )}
                  </div>
                  <a
                    href="https://lucide.dev/icons"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-primary underline"
                  >
                    Browse icons at lucide.dev
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {value && !isValid && (
        <p className="text-sm text-destructive">
          &ldquo;{value}&rdquo; is not a valid icon name
        </p>
      )}
    </div>
  );
}

