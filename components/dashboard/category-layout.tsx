import { ServiceCardContext } from '@/components/common/context-menus/service-card-context';
import { CategoryIcon } from '@/components/common/icons/category-icon';
import { HighlightedText } from '@/components/common/highlighted-text';
import { getDashboardServiceElementId } from '@/lib/dashboard-dom';
import { cn } from '@/lib/utils';
import { LAYOUTS, type Category, type Service, type DashboardLayout } from '@/lib/types';
import { ServiceCard } from './service-card';

interface CategoryLayoutProps {
  category: Category;
  services: Service[];
  layout: DashboardLayout;
  expandOnHover: boolean;
  openLinksInNewTab: boolean;
  onEditService: (service: Service) => void;
  onDeleteService: (service: Service) => void;
  onFocusService?: (service: Service) => void;
  onLaunchService?: (service: Service) => void;
  cacheKey?: number;
  searchTokens?: string[];
  selectedServiceId?: string | null;
  hostMatchServiceIds?: ReadonlySet<string>;
}

export function CategoryLayout({
  category,
  services,
  layout,
  expandOnHover,
  openLinksInNewTab,
  onEditService,
  onDeleteService,
  onFocusService,
  onLaunchService,
  cacheKey,
  searchTokens = [],
  selectedServiceId,
  hostMatchServiceIds,
}: CategoryLayoutProps) {
  if (services.length === 0) {
    return null;
  }

  const isGrid = layout === LAYOUTS.ROWS;

  return (
    <section className={cn(!isGrid && 'flex flex-col')}>
      <h2
        className={cn(
          'flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3',
          !isGrid && 'pb-2 border-b border-border/50'
        )}
      >
        <CategoryIcon icon={category.icon} className="h-4 w-4 opacity-70" />
        <HighlightedText text={category.name} tokens={searchTokens} />
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
            onOpen={onLaunchService}
            index={index}
          >
            <ServiceCard
              service={service}
              expandOnHover={expandOnHover}
              openInNewTab={openLinksInNewTab}
              cacheKey={cacheKey}
              searchTokens={searchTokens}
              isKeyboardSelected={service.id === selectedServiceId}
              revealUrl={hostMatchServiceIds?.has(service.id)}
              domId={getDashboardServiceElementId(service.id)}
              onFocus={onFocusService}
              onLaunch={onLaunchService}
            />
          </ServiceCardContext>
        ))}
      </div>
    </section>
  );
}
