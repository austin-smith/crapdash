'use client';

import { useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ServiceIcon } from '@/components/common/icons/service-icon';
import { HighlightedText } from '@/components/common/highlighted-text';
import { DASHBOARD_SERVICE_ID_ATTRIBUTE } from '@/lib/dashboard-dom';
import { cn } from '@/lib/utils';
import type { Service } from '@/lib/types';

interface ServiceCardProps {
  service: Service;
  expandOnHover: boolean;
  cacheKey?: number;
  searchTokens?: string[];
  isKeyboardSelected?: boolean;
  domId?: string;
  onFocus?: (service: Service) => void;
}

export function ServiceCard({
  service,
  expandOnHover,
  cacheKey,
  searchTokens = [],
  isKeyboardSelected = false,
  domId,
  onFocus,
}: ServiceCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  const onEnter = useCallback(() => {
    if (!expandOnHover) return;
    timeoutRef.current = setTimeout(() => ref.current?.setAttribute('data-expanded', ''), 150);
  }, [expandOnHover]);

  const onLeave = useCallback(() => {
    if (!expandOnHover) return;
    clearTimeout(timeoutRef.current);
    ref.current?.removeAttribute('data-expanded');
  }, [expandOnHover]);

  return (
    <a
      id={domId}
      ref={ref}
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      {...{ [DASHBOARD_SERVICE_ID_ATTRIBUTE]: service.id }}
      data-launch-selected={isKeyboardSelected ? 'true' : undefined}
      className={cn(
        'group block transition-transform hover:scale-[1.03] group-data-[state=open]/context:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg',
        isKeyboardSelected && 'scale-[1.03]'
      )}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={() => onFocus?.(service)}
    >
      <Card
        size="sm"
        className={cn(
          'h-full hover:shadow-lg group-data-[state=open]/context:shadow-lg transition-shadow cursor-pointer',
          isKeyboardSelected && 'shadow-lg ring-2 ring-primary/50 bg-accent/30'
        )}
      >
        <CardHeader className="relative">
          <div className="flex items-start gap-3">
            <ServiceIcon service={service} size="md" emojiClassName="text-3xl" cacheKey={cacheKey} />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1">
                <HighlightedText text={service.name} tokens={searchTokens} />
              </CardTitle>
              <div className="grid grid-rows-[1fr] group-data-[expanded]:grid-rows-[3fr] group-data-[state=open]/context:grid-rows-[3fr] transition-[grid-template-rows] duration-300 ease-out">
                <CardDescription className="line-clamp-1 group-data-[expanded]:line-clamp-3 group-data-[state=open]/context:line-clamp-3 overflow-hidden min-h-0">
                  <HighlightedText text={service.description} tokens={searchTokens} />
                </CardDescription>
              </div>
            </div>
          </div>
          <div className="grid grid-rows-[0fr] group-data-[expanded]:grid-rows-[1fr] group-data-[state=open]/context:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out">
            <div className="overflow-hidden min-h-0">
              <div className="mt-2 max-w-full rounded-md bg-muted/70 px-2 py-1 text-[11px] font-mono text-muted-foreground shadow-sm break-words leading-snug">
                {service.url}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </a>
  );
}
