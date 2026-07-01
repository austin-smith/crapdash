'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ServiceForm } from './service-form';
import type { Category, Service, ServiceFormData } from '@/lib/types';

interface ServiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service;
  initialValues?: ServiceFormData;
  mode?: 'create' | 'duplicate' | 'edit';
  categories: Category[];
  onSuccess: () => void;
  cacheKey?: number;
}

export function ServiceFormModal({
  open,
  onOpenChange,
  service,
  initialValues,
  mode,
  categories,
  onSuccess,
  cacheKey,
}: ServiceFormModalProps) {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };
  const resolvedMode = mode ?? (service ? 'edit' : 'create');
  const formKey = service
    ? `edit:${service.id}`
    : initialValues
      ? `draft:${initialValues.name}:${initialValues.url}:${initialValues.categoryId}`
      : 'create';
  const title = resolvedMode === 'edit'
    ? 'Edit Service'
    : resolvedMode === 'duplicate'
      ? 'Duplicate Service'
      : 'Add Service';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ServiceForm
          key={formKey}
          service={service}
          initialValues={initialValues}
          categories={categories}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
          cacheKey={cacheKey}
        />
      </DialogContent>
    </Dialog>
  );
}
