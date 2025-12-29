import { ServiceCard } from './service-card';
import type { Category, Service } from '@/lib/types';

interface CategoryColumnProps {
  category: Category;
  services: Service[];
}

export function CategoryColumn({ category, services }: CategoryColumnProps) {
  if (services.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold text-foreground mb-4 pb-2 border-b border-border">
        {category.name}
      </h2>
      <div className="flex flex-col gap-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}

