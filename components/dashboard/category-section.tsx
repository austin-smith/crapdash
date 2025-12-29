import { ServiceCard } from './service-card';
import type { Category, Service } from '@/lib/types';

interface CategorySectionProps {
  category: Category;
  services: Service[];
}

export function CategorySection({ category, services }: CategorySectionProps) {
  if (services.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-foreground mb-4">{category.name}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </section>
  );
}
