'use client';

import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICON_TYPES, type IconConfig } from '@/lib/types';

interface CategoryIconProps extends LucideProps {
  icon?: IconConfig;
  /** Override emoji text size (e.g., 'text-2xl') */
  emojiClassName?: string;
}

// Known non-icon exports to exclude
const NON_ICONS = new Set([
  'createLucideIcon',
  'defaultAttributes', 
  'Icon',
  'icons',
]);

// Build case-insensitive lookup: lowercase -> actual PascalCase name
const iconLookup: Record<string, string> = {};
for (const key of Object.keys(LucideIcons)) {
  if (!NON_ICONS.has(key)) {
    iconLookup[key.toLowerCase()] = key;
  }
}

// Get unique icon names (exclude duplicates like HeartIcon, LucideHeart)
// Only keep the base PascalCase names (e.g., "Heart" not "HeartIcon" or "LucideHeart")
const uniqueIconNames: string[] = Object.keys(LucideIcons)
  .filter(key => 
    !NON_ICONS.has(key) && 
    !key.endsWith('Icon') && 
    !key.startsWith('Lucide')
  )
  .sort((a, b) => a.localeCompare(b));

export function getIconNames(): string[] {
  return uniqueIconNames;
}

export function resolveIconName(name: string): string | null {
  if (!name) return null;
  return iconLookup[name.toLowerCase()] ?? null;
}

export function isValidIconName(name: string): boolean {
  return resolveIconName(name) !== null;
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
    const resolved = resolveIconName(icon.value);
    if (!resolved) return null;
    
    const Icon = LucideIcons[resolved as keyof typeof LucideIcons] as React.ComponentType<LucideProps>;
    return <Icon className={className} {...props} />;
  }
  
  return null;
}
