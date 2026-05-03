import { describe, expect, it } from 'vitest';
import { RANDOM_APPEARANCE } from '@/lib/appearance-config';
import { parsePreferences } from '@/lib/preferences';
import { LAYOUTS } from '@/lib/types';

function encodePreferenceCookie(value: unknown): string {
  return encodeURIComponent(JSON.stringify(value));
}

describe('parsePreferences', () => {
  it('returns an empty object for missing or malformed cookies', () => {
    expect(parsePreferences(undefined)).toEqual({});
    expect(parsePreferences('%')).toEqual({});
    expect(parsePreferences(encodeURIComponent('{bad json'))).toEqual({});
  });

  it('accepts valid persisted preference values', () => {
    expect(parsePreferences(encodePreferenceCookie({
      layout: LAYOUTS.COLUMNS,
      expandOnHover: true,
      appearance: 'mono',
    }))).toEqual({
      layout: LAYOUTS.COLUMNS,
      expandOnHover: true,
      appearance: 'mono',
    });
  });

  it('ignores invalid values while preserving valid fields', () => {
    expect(parsePreferences(encodePreferenceCookie({
      layout: 'grid',
      expandOnHover: false,
      appearance: 'unknown',
    }))).toEqual({
      expandOnHover: false,
    });
  });

  it('accepts the random appearance setting', () => {
    expect(parsePreferences(encodePreferenceCookie({
      appearance: RANDOM_APPEARANCE,
    }))).toEqual({
      appearance: RANDOM_APPEARANCE,
    });
  });
});
