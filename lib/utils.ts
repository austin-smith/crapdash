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

export function getConfigExportFilename(date = new Date()): string {
  return `crapdash-config-${date.toISOString().slice(0, 10)}.json`;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const RELATIVE_TIME_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * DAY_MS],
  ['month', 30 * DAY_MS],
  ['week', 7 * DAY_MS],
  ['day', DAY_MS],
  ['hour', HOUR_MS],
  ['minute', MINUTE_MS],
];

/**
 * Formats a date relative to now, e.g. "Just now", "18 minutes ago", "Yesterday", "Last week"
 */
export function formatRelativeTime(date: Date, now = new Date(), locale?: string): string {
  const elapsed = date.getTime() - now.getTime();
  const match = RELATIVE_TIME_UNITS.find(([, ms]) => Math.abs(elapsed) >= ms);
  if (!match) return 'Just now';

  const [unit, unitMs] = match;
  const text = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.trunc(elapsed / unitMs), unit);

  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
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
