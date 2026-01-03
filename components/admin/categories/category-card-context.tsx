'use client';

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { Category } from '@/lib/types';

interface CategoryCardContextProps {
  category: Category;
  children: React.ReactNode;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  index: number;
}

/**
 * Admin-only context menu wrapper for category cards.
 */
export function CategoryCardContext({
  category,
  children,
  onEdit,
  onDelete,
  index,
}: CategoryCardContextProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="group/context animate-card-in"
          style={{ '--index': index } as React.CSSProperties}
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-40">
        <ContextMenuItem onClick={() => onEdit(category)}>
          <Pencil />
          Edit
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={() => onDelete(category)}>
          <Trash2 />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
