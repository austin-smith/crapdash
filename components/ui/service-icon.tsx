import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ICON_TYPES, type Service } from '@/lib/types';
import { CategoryIcon } from './category-icon';

interface ServiceIconProps {
  service: Service;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
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

export function ServiceIcon({ service, size = 'md', className, cacheKey }: ServiceIconProps) {
  const sizeClass = SIZE_CLASSES[size];

  // If service has an icon, display it based on type
  if (service.icon) {
    if (service.icon.type === ICON_TYPES.IMAGE) {
      const iconUrl = `/api/${service.icon.value}`;
      const iconSrc = cacheKey ? `${iconUrl}?v=${cacheKey}` : iconUrl;
      return (
        <div className={cn('relative flex-shrink-0 rounded-lg overflow-hidden', sizeClass, className)}>
          <Image
            src={iconSrc}
            alt={`${service.name} icon`}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      );
    }

    if (service.icon.type === ICON_TYPES.ICON) {
      const lucideSize = LUCIDE_ICON_SIZE_CLASSES[size];
      return (
        <div
          className={cn(
            'flex-shrink-0 rounded-lg flex items-center justify-center bg-muted',
            sizeClass,
            className
          )}
        >
          <CategoryIcon name={service.icon.value} className={lucideSize} />
        </div>
      );
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
