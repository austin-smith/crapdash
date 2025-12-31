import { ServiceCardContext } from './service-card-context';
import { CategoryIcon } from '@/components/ui/category-icon';
import { cn } from '@/lib/utils';
import type { Category, Service, DashboardLayout } from '@/lib/types';

interface CategoryLayoutProps {
  category: Category;
  services: Service[];
  layout: DashboardLayout;
  onEditService: (service: Service) => void;
  onDeleteService: (service: Service) => void;
  cacheKey?: number;
}

export function CategoryLayout({ category, services, layout, onEditService, onDeleteService, cacheKey }: CategoryLayoutProps) {
  if (services.length === 0) {
    return null;
  }

  const isGrid = layout === 'rows';

  return (
    <section className={cn(!isGrid && 'flex flex-col')}>
      <h2
        className={cn(
          'flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3',
          !isGrid && 'pb-2 border-b border-border/50'
        )}
      >
        <CategoryIcon name={category.icon} className="h-4 w-4 opacity-70" />
        {category.name}
      </h2>
      <div
        className={
          isGrid
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'flex flex-col gap-3'
        }
      >
        {services.map((service, index) => (
          <ServiceCardContext
            key={service.id}
            service={service}
            onEdit={onEditService}
            onDelete={onDeleteService}
            cacheKey={cacheKey}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

