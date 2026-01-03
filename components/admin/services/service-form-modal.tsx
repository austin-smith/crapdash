'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ServiceForm } from './service-form';
import type { Category, Service } from '@/lib/types';

interface ServiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service;
  categories: Category[];
  onSuccess: () => void;
  cacheKey?: number;
}

export function ServiceFormModal({
  open,
  onOpenChange,
  service,
  categories,
  onSuccess,
  cacheKey,
}: ServiceFormModalProps) {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{service ? 'Edit Service' : 'Add Service'}</DialogTitle>
        </DialogHeader>
        <ServiceForm
          service={service}
          categories={categories}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
          cacheKey={cacheKey}
        />
      </DialogContent>
    </Dialog>
  );
}
