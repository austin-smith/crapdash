import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ServiceIcon } from '@/components/ui/service-icon';
import type { Service } from '@/lib/types';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      <Card size="sm" className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ServiceIcon service={service} size="md" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1">{service.name}</CardTitle>
              <div className="relative mt-1 h-4 overflow-hidden">
                <CardDescription className="line-clamp-1 transition-transform duration-500 ease-out group-hover:-translate-y-full">
                  {service.description}
                </CardDescription>
                <p className="absolute inset-0 font-mono text-[11px] text-muted-foreground truncate translate-y-full transition-transform duration-500 ease-out group-hover:translate-y-0">
                  {service.url}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </a>
  );
}
