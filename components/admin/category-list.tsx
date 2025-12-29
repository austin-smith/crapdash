'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Pencil, Trash2 } from 'lucide-react';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { deleteCategory } from '@/lib/actions';
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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const serviceCount = getServiceCount(category.id);
          return (
            <Card key={category.id}>
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
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
        />
      )}

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}
    </>
  );
}
