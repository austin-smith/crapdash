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
import { LAYOUTS, type DashboardLayout } from '@/lib/types';

interface LayoutToggleProps {
  layout: DashboardLayout;
  onLayoutChange: (layout: DashboardLayout) => void;
}

export function LayoutToggle({ layout, onLayoutChange }: LayoutToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-lg">
          {layout === LAYOUTS.ROWS ? <Rows3 size={18} /> : <Columns3 size={18} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={layout} onValueChange={(v) => onLayoutChange(v as DashboardLayout)}>
          <DropdownMenuRadioItem value={LAYOUTS.ROWS}>
            <Rows3 size={14} />
            Rows
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={LAYOUTS.COLUMNS}>
            <Columns3 size={14} />
            Columns
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
