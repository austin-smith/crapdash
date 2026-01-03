'use client';

import { useState, useMemo } from 'react';
import { ChevronsUpDown, ExternalLink, Ban } from 'lucide-react';
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
import { CategoryIcon, getIconNames, isValidIconName, resolveIconName } from '@/components/ui/category-icon';
import { ICON_TYPES } from '@/lib/types';

interface LucideIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const MAX_RESULTS = 60;

export function LucideIconPicker({
  value,
  onChange,
  disabled,
}: LucideIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const allIcons = useMemo(() => getIconNames(), []);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) {
      return allIcons.slice(0, MAX_RESULTS);
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
    
    return matches.slice(0, MAX_RESULTS);
  }, [search, allIcons]);

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
  };

  const resolvedValue = value ? resolveIconName(value) : null;
  const isValid = value ? isValidIconName(value) : null;

  return (
    <div className="space-y-3">
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
        <PopoverContent className="w-80 p-0" align="start" side="bottom" sideOffset={4} collisionPadding={8}>
          <Command filter={() => 1}>
            <CommandInput
              placeholder="Search icons..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="h-72 overflow-y-auto p-2">
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
            {search && filteredIcons.length === MAX_RESULTS && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-t text-center">
                Type more to narrow results...
              </div>
            )}
            <div className="px-3 py-2 border-t">
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

      {value && !isValid && (
        <p className="text-sm text-destructive">
          &ldquo;{value}&rdquo; is not a valid icon name
        </p>
      )}
    </div>
  );
}

export { isValidIconName, resolveIconName };
