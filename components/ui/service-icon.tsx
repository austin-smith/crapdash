'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ICON_TYPES, type Service } from '@/lib/types';
import { CategoryIcon, resolveIconName } from './category-icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface ServiceIconProps {
  service: Service;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Override emoji text size (e.g., 'text-3xl') */
  emojiClassName?: string;
  cacheKey?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  monitoring: 'bg-blue-500',
  media: 'bg-purple-500',
  network: 'bg-green-500',
  default: 'bg-gray-500',
};

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-xl',
};

const LUCIDE_ICON_SIZE_CLASSES = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
};

const EMOJI_SIZE_CLASSES = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

export function ServiceIcon({ service, size = 'md', className, emojiClassName, cacheKey }: ServiceIconProps) {
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const sizeClass = SIZE_CLASSES[size];
  const lucideSize = LUCIDE_ICON_SIZE_CLASSES[size];
  const emojiSize = EMOJI_SIZE_CLASSES[size];
  const isInvalidLucide =
    service.icon?.type === ICON_TYPES.ICON && !resolveIconName(service.icon.value);
  const imageKey =
    service.icon?.type === ICON_TYPES.IMAGE
      ? `${service.icon.value ?? ''}:${cacheKey ?? ''}`
      : null;
  const loadFailed = imageKey !== null && failedKey === imageKey;
  const isLoaded = imageKey !== null && loadedKey === imageKey;

  // If service has an icon, display it based on type
  if (service.icon) {
    // Emoji icon
    if (service.icon.type === ICON_TYPES.EMOJI) {
      return (
        <div
          className={cn(
            'flex-shrink-0 rounded-lg flex items-center justify-center bg-muted',
            sizeClass,
            className
          )}
        >
          <span className={cn('leading-none', emojiClassName || emojiSize)} role="img" aria-label={`${service.name} icon`}>
            {service.icon.value}
          </span>
        </div>
      );
    }

    // Image icon
    if (service.icon.type === ICON_TYPES.IMAGE && !loadFailed) {
      const iconUrl = `/api/${service.icon.value}`;
      const iconSrc = cacheKey ? `${iconUrl}?v=${cacheKey}` : iconUrl;
      return (
        <div className={cn('relative flex-shrink-0 rounded-lg overflow-hidden', sizeClass, className)}>
          {!isLoaded && <Skeleton className="absolute inset-0" aria-hidden />}
          <Image
            src={iconSrc}
            alt={`${service.name} icon`}
            fill
            className={cn('object-cover transition-opacity', !isLoaded && 'opacity-0')}
            unoptimized
            onError={() => imageKey !== null && setFailedKey(imageKey)}
            onLoad={() => imageKey !== null && setLoadedKey(imageKey)}
          />
        </div>
      );
    }

    // Lucide icon or fallback for failed image load
    if (service.icon.type === ICON_TYPES.ICON || loadFailed || isInvalidLucide) {
      const lucideName = loadFailed || isInvalidLucide ? 'ImageOff' : service.icon.value;
      const isFallback = loadFailed || isInvalidLucide;
      const fallbackClasses = isFallback
        ? 'border border-dashed border-muted-foreground/50 bg-muted/40 text-muted-foreground/80 shadow-inner'
        : 'bg-muted';
      const tooltipMessage = loadFailed ? 'Failed to load image' : 'Invalid icon name';
      const iconNode = (
        <div
          className={cn(
            'flex-shrink-0 rounded-lg flex items-center justify-center',
            fallbackClasses,
            sizeClass,
            className
          )}
        >
          <CategoryIcon icon={{ type: ICON_TYPES.ICON, value: lucideName }} className={lucideSize} />
        </div>
      );

      if (isFallback) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>{iconNode}</TooltipTrigger>
            <TooltipContent side="bottom">{tooltipMessage}</TooltipContent>
          </Tooltip>
        );
      }

      return iconNode;
    }
  }

  // Fallback: Show first letter with category-based color
  const initial = service.name.charAt(0).toUpperCase();
  const bgColor = CATEGORY_COLORS[service.categoryId] || CATEGORY_COLORS.default;

  return (
    <div
      className={cn(
        'flex-shrink-0 rounded-lg flex items-center justify-center text-white font-semibold',
        sizeClass,
        bgColor,
        className
      )}
    >
      {initial}
    </div>
  );
}
