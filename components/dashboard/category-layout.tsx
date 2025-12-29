import { ServiceCard } from './service-card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { cn } from '@/lib/utils';
import type { Category, Service, DashboardLayout } from '@/lib/types';

interface CategoryLayoutProps {
  category: Category;
  services: Service[];
  layout: DashboardLayout;
}

export function CategoryLayout({ category, services, layout }: CategoryLayoutProps) {
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
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </section>
  );
}

