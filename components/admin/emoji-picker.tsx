'use client';

import { useState } from 'react';
import { EmojiPicker as FrimousseEmojiPicker } from 'frimousse';
import { ChevronsUpDown, Ban, Search } from 'lucide-react';
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EmojiPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({
  value,
  onChange,
  disabled,
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value ? (
            <span className="flex items-center gap-2">
              <span className="text-lg leading-none">{value}</span>
              <span className="text-xs text-muted-foreground">Emoji</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select emoji...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="start" 
        side="bottom" 
        sideOffset={4}
        collisionPadding={8}
      >
        <FrimousseEmojiPicker.Root
          onEmojiSelect={(emoji) => handleEmojiSelect(emoji.emoji)}
          className="flex flex-col p-1"
          columns={8}
        >
          {/* Search input - matches CommandInput wrapper */}
          <div className="p-1 pb-0">
            <InputGroup className="bg-input/20 dark:bg-input/30 h-8!">
              <FrimousseEmojiPicker.Search
                placeholder="Search emoji..."
                className="w-full text-xs/relaxed outline-hidden disabled:cursor-not-allowed disabled:opacity-50 bg-transparent px-2"
              />
              <InputGroupAddon>
                <Search className="size-3.5 shrink-0 opacity-50" />
              </InputGroupAddon>
            </InputGroup>
          </div>

          <FrimousseEmojiPicker.Viewport 
            className="h-72 overflow-y-auto px-2"
            onWheel={(e) => e.stopPropagation()}
          >
            <FrimousseEmojiPicker.Loading className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Loading emoji...
            </FrimousseEmojiPicker.Loading>

            <FrimousseEmojiPicker.Empty className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No emoji found
            </FrimousseEmojiPicker.Empty>

            <TooltipProvider delayDuration={300}>
              {/* Clear button row */}
              <div className="pt-3 mb-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="flex items-center justify-center size-8 rounded-md cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-accent transition-colors text-muted-foreground/50 hover:text-muted-foreground"
                    >
                      <Ban className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px] px-2 py-1">
                    Remove emoji
                  </TooltipContent>
                </Tooltip>
              </div>

              <FrimousseEmojiPicker.List
                components={{
                  CategoryHeader: ({ category, ...props }) => (
                    <div 
                      className="py-2 px-1 text-xs font-medium text-muted-foreground bg-popover"
                      {...props}
                    >
                      {category.label}
                    </div>
                  ),
                  Row: (props) => (
                    <div className="flex gap-1" {...props} />
                  ),
                  Emoji: ({ emoji, ...props }) => (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center justify-center size-8 text-xl rounded-md cursor-pointer bg-muted/40 hover:bg-accent transition-colors"
                          {...props}
                        >
                          {emoji.emoji}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px] px-2 py-1">
                        {emoji.label}
                      </TooltipContent>
                    </Tooltip>
                  ),
                }}
              />
            </TooltipProvider>
          </FrimousseEmojiPicker.Viewport>
        </FrimousseEmojiPicker.Root>
      </PopoverContent>
    </Popover>
  );
}
