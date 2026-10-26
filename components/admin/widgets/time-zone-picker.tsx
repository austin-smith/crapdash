'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

const LOCAL_TIME_ZONE_VALUE = '__local__';

interface TimeZonePickerProps {
  id?: string;
  /** IANA time zone, or empty for the viewer's local time zone. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function getTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [];
  }
}

export function TimeZonePicker({ id, value, onChange, disabled }: TimeZonePickerProps) {
  const [open, setOpen] = useState(false);
  const timeZones = useMemo(() => getTimeZones(), []);
  const localTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const handleSelect = (next: string) => {
    onChange(next === LOCAL_TIME_ZONE_VALUE ? '' : next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {value ? (
            <span className="font-mono text-xs">{value}</span>
          ) : (
            <span>Viewer&apos;s local time</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search time zones..." />
          <CommandList onWheel={(event) => event.stopPropagation()}>
            <CommandEmpty>No time zones found</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={LOCAL_TIME_ZONE_VALUE}
                keywords={['local', 'browser', localTimeZone]}
                onSelect={handleSelect}
              >
                <Check className={cn('size-4', value ? 'opacity-0' : 'opacity-100')} />
                Viewer&apos;s local time
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{localTimeZone}</span>
              </CommandItem>
              {timeZones.map((timeZone) => (
                <CommandItem
                  key={timeZone}
                  value={timeZone}
                  keywords={[timeZone.replace(/[/_]/g, ' ')]}
                  onSelect={handleSelect}
                  className="font-mono text-xs"
                >
                  <Check className={cn('size-4', value === timeZone ? 'opacity-100' : 'opacity-0')} />
                  {timeZone}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
