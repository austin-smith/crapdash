import type {
  ConfigChangeSummary,
  ConfigCollectionChanges,
  DashboardConfig,
} from './types';

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => isEqual(item, b[index]));
  }

  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord).filter((key) => aRecord[key] !== undefined);
  const bKeys = Object.keys(bRecord).filter((key) => bRecord[key] !== undefined);

  return aKeys.length === bKeys.length && aKeys.every((key) => isEqual(aRecord[key], bRecord[key]));
}

function diffById<T extends { id: string }>(from: T[], to: T[]): ConfigCollectionChanges {
  const fromById = new Map(from.map((item) => [item.id, item]));
  const toIds = new Set(to.map((item) => item.id));
  let added = 0;
  let changed = 0;

  for (const item of to) {
    const previous = fromById.get(item.id);
    if (!previous) {
      added += 1;
    } else if (!isEqual(previous, item)) {
      changed += 1;
    }
  }

  return {
    added,
    removed: from.filter((item) => !toIds.has(item.id)).length,
    changed,
  };
}

function isReordered<T extends { id: string }>(from: T[], to: T[]): boolean {
  const toIds = new Set(to.map((item) => item.id));
  const fromIds = new Set(from.map((item) => item.id));
  const fromOrder = from.map((item) => item.id).filter((id) => toIds.has(id));
  const toOrder = to.map((item) => item.id).filter((id) => fromIds.has(id));

  return fromOrder.some((id, index) => id !== toOrder[index]);
}

/** Summarizes what replacing `from` with `to` would change. */
export function diffConfigs(from: DashboardConfig, to: DashboardConfig): ConfigChangeSummary {
  return {
    categories: diffById(from.categories, to.categories),
    services: diffById(from.services, to.services),
    widgets: diffById(from.widgets ?? [], to.widgets ?? []),
    appSettingsChanged: from.appTitle !== to.appTitle || !isEqual(from.appLogo, to.appLogo),
    reordered:
      isReordered(from.categories, to.categories) ||
      isReordered(from.services, to.services) ||
      isReordered(from.widgets ?? [], to.widgets ?? []),
  };
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatCollectionChanges(
  changes: ConfigCollectionChanges,
  singular: string,
  plural: string
): string[] {
  const parts: string[] = [];

  if (changes.added > 0) parts.push(`+${pluralize(changes.added, singular, plural)}`);
  if (changes.removed > 0) parts.push(`−${pluralize(changes.removed, singular, plural)}`);
  if (changes.changed > 0) parts.push(`${pluralize(changes.changed, singular, plural)} edited`);

  return parts;
}

/** Formats a summary as short phrases, e.g. ["+2 services", "−1 category"]. Empty when nothing differs. */
export function formatConfigChangeSummary(summary: ConfigChangeSummary): string[] {
  const parts = [
    ...formatCollectionChanges(summary.services, 'service', 'services'),
    ...formatCollectionChanges(summary.categories, 'category', 'categories'),
    ...formatCollectionChanges(summary.widgets, 'widget', 'widgets'),
  ];

  if (summary.appSettingsChanged) parts.push('header changed');
  if (summary.reordered) parts.push('reordered');

  return parts;
}
