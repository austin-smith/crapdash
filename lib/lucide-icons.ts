import * as LucideIcons from 'lucide-react';

// Exclude helper exports that are not actual icons
const NON_ICONS = new Set(['createLucideIcon', 'defaultAttributes', 'Icon', 'icons']);

// Build a case-insensitive lookup of icon names
const iconLookup: Record<string, string> = {};
for (const key of Object.keys(LucideIcons)) {
  if (!NON_ICONS.has(key)) {
    iconLookup[key.toLowerCase()] = key;
  }
}

// Unique icon names (exclude duplicates)
const uniqueIconNames: string[] = Object.keys(LucideIcons)
  .filter(
    (key) =>
      !NON_ICONS.has(key) &&
      !key.endsWith('Icon') &&
      !key.startsWith('Lucide')
  )
  .sort((a, b) => a.localeCompare(b));

export function resolveLucideIconName(name: string): string | null {
  if (!name) return null;
  return iconLookup[name.toLowerCase()] ?? null;
}

export function isValidLucideIconName(name: string): boolean {
  return resolveLucideIconName(name) !== null;
}

export function getLucideIconNames(): string[] {
  return uniqueIconNames;
}
