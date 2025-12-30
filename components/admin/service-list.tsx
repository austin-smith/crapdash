'use client';

import { useState, useTransition, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CornerRibbon } from '@/components/ui/corner-ribbon';
import { CategoryIcon } from '@/components/ui/category-icon';
import { SortableList, SortableItem } from '@/components/ui/sortable';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { ServiceIcon } from '@/components/ui/service-icon';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { deleteService, reorderServices } from '@/lib/actions';
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
  const [localServices, setLocalServices] = useState(services);
  const [isPending, startTransition] = useTransition();

  // Sync local state when prop changes
  if (services !== localServices && !isPending) {
    setLocalServices(services);
  }

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped = new Map<string, Service[]>();
    
    // Initialize with empty arrays for all categories (to maintain category order)
    for (const category of categories) {
      grouped.set(category.id, []);
    }
    
    // Group services
    for (const service of localServices) {
      const existing = grouped.get(service.categoryId) || [];
      existing.push(service);
      grouped.set(service.categoryId, existing);
    }
    
    return grouped;
  }, [localServices, categories]);

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

  const handleReorder = (categoryId: string, newServices: Service[]) => {
    // Optimistic update - rebuild local services with new order for this category
    setLocalServices(prev => {
      const otherServices = prev.filter(s => s.categoryId !== categoryId);
      // Find where this category's services were in the original array
      const firstIndex = prev.findIndex(s => s.categoryId === categoryId);
      if (firstIndex === -1) return [...otherServices, ...newServices];
      
      // Rebuild maintaining original position
      const result: Service[] = [];
      let inserted = false;
      for (const service of prev) {
        if (service.categoryId === categoryId) {
          if (!inserted) {
            result.push(...newServices);
            inserted = true;
          }
        } else {
          result.push(service);
        }
      }
      if (!inserted) {
        result.push(...newServices);
      }
      return result;
    });

    // Persist to server
    startTransition(async () => {
      const orderedIds = newServices.map(s => s.id);
      const result = await reorderServices(categoryId, orderedIds);
      
      if (!result.success) {
        // Revert on error
        setLocalServices(services);
        console.error('Failed to reorder services:', result.errors);
      } else {
        onDeleted(); // Refresh data
      }
    });
  };

  const renderServiceCard = (service: Service, isOverlay = false) => {
    return (
      <Card className={cn(
        'relative overflow-hidden flex flex-col',
        isOverlay && 'shadow-lg ring-2 ring-primary/20'
      )}>
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
    );
  };

  return (
    <>
      <div className="space-y-8">
        {categories.map((category) => {
          const categoryServices = servicesByCategory.get(category.id) || [];
          
          if (categoryServices.length === 0) {
            return null;
          }

          return (
            <section key={category.id}>
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3 pb-2 border-b border-border/50">
                <CategoryIcon name={category.icon} className="h-4 w-4 opacity-70" />
                {category.name}
                <span className="text-xs">({categoryServices.length})</span>
              </h3>
              
              <SortableList
                items={categoryServices}
                getItemId={(service) => service.id}
                onReorder={(newServices) => handleReorder(category.id, newServices)}
                strategy="grid"
                renderOverlay={(service) => (
                  <div className="w-full max-w-sm">
                    {renderServiceCard(service, true)}
                  </div>
                )}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {categoryServices.map((service) => (
                    <SortableItem key={service.id} id={service.id}>
                      {renderServiceCard(service)}
                    </SortableItem>
                  ))}
                </div>
              </SortableList>
            </section>
          );
        })}
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
