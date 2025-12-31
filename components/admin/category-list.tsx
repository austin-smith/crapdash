'use client';

import { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/ui/category-icon';
import { SortableList, SortableItem } from '@/components/ui/sortable';
import { Pencil, Trash2 } from 'lucide-react';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { deleteCategory, reorderCategories } from '@/lib/actions';
import type { Category, Service } from '@/lib/types';

interface CategoryListProps {
  categories: Category[];
  services: Service[];
  onEdit: (category: Category) => void;
  onDeleted: () => void;
}

export function CategoryList({ categories, services, onEdit, onDeleted }: CategoryListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCategories, setLocalCategories] = useState(categories);
  const [isPending, startTransition] = useTransition();

  // Sync local state when prop changes
  if (categories !== localCategories && !isPending) {
    setLocalCategories(categories);
  }

  const getServiceCount = (categoryId: string) => {
    return services.filter((s) => s.categoryId === categoryId).length;
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
    setError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    setError(null);

    const result = await deleteCategory(categoryToDelete.id);

    if (result.success) {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      onDeleted();
    } else {
      setError(result.errors[0]?.message || 'Failed to delete category');
    }

    setIsDeleting(false);
  };

  const handleReorder = (newCategories: Category[]) => {
    // Optimistic update
    setLocalCategories(newCategories);

    // Persist to server
    startTransition(async () => {
      const orderedIds = newCategories.map(c => c.id);
      const result = await reorderCategories(orderedIds);
      
      if (!result.success) {
        // Revert on error
        setLocalCategories(categories);
        console.error('Failed to reorder categories:', result.errors);
      } else {
        onDeleted(); // Refresh data
      }
    });
  };

  const renderCategoryCard = (category: Category, isOverlay = false) => {
    const serviceCount = getServiceCount(category.id);
    return (
      <Card className={isOverlay ? 'shadow-lg ring-2 ring-primary/20' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {category.icon ? (
                <div className="flex items-center justify-center w-10 h-10 rounded-lg border bg-muted/50 shrink-0">
                  <CategoryIcon name={category.icon} className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-dashed bg-muted/30 shrink-0">
                  <span className="text-xs text-muted-foreground">—</span>
                </div>
              )}
              <CardTitle className="text-lg">{category.name}</CardTitle>
            </div>
            <Badge variant="secondary">{serviceCount} services</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(category)}
              className="flex-1"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteClick(category)}
              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <SortableList
        items={localCategories}
        getItemId={(category) => category.id}
        onReorder={handleReorder}
        strategy="grid"
        renderOverlay={(category) => (
          <div className="w-full max-w-sm">
            {renderCategoryCard(category, true)}
          </div>
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {localCategories.map((category, index) => (
            <SortableItem 
              key={category.id} 
              id={category.id}
              className="animate-card-in"
              style={{ '--index': index } as React.CSSProperties}
            >
              {renderCategoryCard(category)}
            </SortableItem>
          ))}
        </div>
      </SortableList>

      {categoryToDelete && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setCategoryToDelete(null);
              setError(null);
            }
          }}
          itemName={categoryToDelete.name}
          itemType="category"
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
          serviceCount={getServiceCount(categoryToDelete.id)}
          error={error}
        />
      )}
    </>
  );
}
