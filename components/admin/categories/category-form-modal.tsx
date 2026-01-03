'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CategoryForm } from './category-form';
import type { Category } from '@/lib/types';

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
  onSuccess: () => void;
}

export function CategoryFormModal({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormModalProps) {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <CategoryForm
          category={category}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
