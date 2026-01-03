'use client';

import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICON_TYPES, type IconConfig } from '@/lib/types';
import { resolveLucideIconName } from '@/lib/lucide-icons';

interface CategoryIconProps extends LucideProps {
  icon?: IconConfig;
  /** Override emoji text size (e.g., 'text-2xl') */
  emojiClassName?: string;
}

export function CategoryIcon({ icon, className, emojiClassName, ...props }: CategoryIconProps) {
  if (!icon) return null;

  if (icon.type === ICON_TYPES.EMOJI) {
    return (
      <span
        className={cn('inline-flex items-center justify-center leading-none', emojiClassName || 'text-base', className)}
        role="img"
        aria-label="category icon"
      >
        {icon.value}
      </span>
    );
  }

  if (icon.type === ICON_TYPES.ICON) {
    const resolved = resolveLucideIconName(icon.value);
    if (!resolved) return null;

    const Icon = LucideIcons[resolved as keyof typeof LucideIcons] as React.ComponentType<LucideProps>;
    return <Icon className={className} {...props} />;
  }

  return null;
}
