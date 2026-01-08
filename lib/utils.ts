import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { DEFAULT_APP_TITLE } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the app title with fallback to default
 */
export function getAppTitle(appTitle?: string): string {
  return appTitle?.trim() || DEFAULT_APP_TITLE;
}

/**
 * Set a cookie (client-side only)
 */
export function setCookie(name: string, value: string, maxAgeDays = 365): void {
  const maxAge = 60 * 60 * 24 * maxAgeDays;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
