'use client';

import { Rows3, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DashboardLayout } from '@/lib/types';

interface LayoutToggleProps {
  layout: DashboardLayout;
  onLayoutChange: (layout: DashboardLayout) => void;
  mounted: boolean;
}

export function LayoutToggle({ layout, onLayoutChange, mounted }: LayoutToggleProps) {
  if (!mounted) {
    return (
      <Button variant="outline" size="icon-lg" disabled>
        <span className="h-[18px] w-[18px]" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-lg">
              {layout === 'rows' ? <Rows3 size={18} /> : <Columns3 size={18} />}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Layout</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={layout} onValueChange={(v) => onLayoutChange(v as DashboardLayout)}>
          <DropdownMenuRadioItem value="rows">
            <Rows3 size={14} />
            Rows
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="columns">
            <Columns3 size={14} />
            Columns
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

