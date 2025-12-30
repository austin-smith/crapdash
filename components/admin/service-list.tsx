'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CornerRibbon } from '@/components/ui/corner-ribbon';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { ServiceIcon } from '@/components/ui/service-icon';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { deleteService } from '@/lib/actions';
import type { Category, Service } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ServiceListProps {
  services: Service[];
  categories: Category[];
  onEdit: (service: Service) => void;
  onDeleted: () => void;
}

export function ServiceList({ services, categories, onEdit, onDeleted }: ServiceListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;

    setIsDeleting(true);

    const result = await deleteService(serviceToDelete.id);

    if (result.success) {
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
      onDeleted();
    }

    setIsDeleting(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {services.map((service) => (
          <Card key={service.id} className="relative overflow-hidden flex flex-col">
            {!service.active && (
              <CornerRibbon className="bg-amber-500 text-white">
                Inactive
              </CornerRibbon>
            )}
            <CardHeader className="flex-1">
              <div className={cn('flex items-start gap-3', !service.active && 'opacity-60')}>
                <ServiceIcon service={service} size="md" className={cn(!service.active && 'grayscale')} />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="truncate">{service.name}</span>
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {service.description}
                  </CardDescription>
                  <Badge variant="secondary" className="w-fit mt-2">
                    {getCategoryName(service.categoryId)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(service)}
                  className="flex-1"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteClick(service)}
                  className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {serviceToDelete && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setServiceToDelete(null);
            }
          }}
          itemName={serviceToDelete.name}
          itemType="service"
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
