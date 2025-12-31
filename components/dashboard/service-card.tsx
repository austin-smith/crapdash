import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ServiceIcon } from '@/components/ui/service-icon';
import type { Service } from '@/lib/types';

interface ServiceCardProps {
  service: Service;
  cacheKey?: number;
}

export function ServiceCard({ service, cacheKey }: ServiceCardProps) {
  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block transition-transform hover:scale-[1.03] group-data-[state=open]/context:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      <Card size="sm" className="h-full hover:shadow-lg group-data-[state=open]/context:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="relative">
          <div className="flex items-start gap-3">
            <ServiceIcon service={service} size="md" cacheKey={cacheKey} />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1">{service.name}</CardTitle>
              <CardDescription className="line-clamp-1 group-hover:line-clamp-3 group-data-[state=open]/context:line-clamp-3 overflow-hidden max-h-[1.5em] group-hover:max-h-[4.5em] group-data-[state=open]/context:max-h-[4.5em] transition-[max-height] duration-350 delay-150">
                {service.description}
              </CardDescription>
            </div>
          </div>
          <div className="overflow-hidden transition-[max-height,opacity,padding] duration-350 delay-150 max-h-0 opacity-0 pt-0 group-hover:max-h-24 group-hover:opacity-100 group-hover:pt-2 group-data-[state=open]/context:max-h-24 group-data-[state=open]/context:opacity-100 group-data-[state=open]/context:pt-2">
            <div className="max-w-full rounded-md bg-muted/70 px-2 py-1 text-[11px] font-mono text-muted-foreground shadow-sm break-words leading-snug">
              {service.url}
            </div>
          </div>
        </CardHeader>
      </Card>
    </a>
  );
}
