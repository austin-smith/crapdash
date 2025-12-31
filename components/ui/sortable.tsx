'use client';

import React, { useMemo, useState, useId } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

// Types
interface SortableListProps<T> {
  items: T[];
  getItemId: (item: T) => string;
  onReorder: (items: T[]) => void;
  children: ReactNode;
  strategy?: 'vertical' | 'grid';
  renderOverlay?: (activeItem: T) => ReactNode;
}

interface SortableItemProps {
  id: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// Sortable list wrapper
export function SortableList<T>({
  items,
  getItemId,
  onReorder,
  children,
  strategy = 'grid',
  renderOverlay,
}: SortableListProps<T>) {
  const dndContextId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const itemIds = useMemo(() => items.map(getItemId), [items, getItemId]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = activeId ? items.find(item => getItemId(item) === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = itemIds.indexOf(active.id as string);
      const newIndex = itemIds.indexOf(over.id as string);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const sortingStrategy = strategy === 'vertical' ? verticalListSortingStrategy : rectSortingStrategy;

  return (
    <DndContext
      id={dndContextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={itemIds} strategy={sortingStrategy}>
        {children}
      </SortableContext>
      <DragOverlay>
        {activeItem && renderOverlay ? renderOverlay(activeItem) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Sortable item wrapper
export function SortableItem({ id, children, className, style: styleProp }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...styleProp,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative cursor-grab active:cursor-grabbing',
        isDragging && 'z-50 opacity-50',
        className
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export { arrayMove };
