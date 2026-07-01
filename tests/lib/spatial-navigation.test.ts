import { describe, expect, it } from 'vitest';
import { getNextSpatialItemId, type SpatialItem } from '@/lib/spatial-navigation';

function item(id: string, left: number, top: number, width = 100, height = 80): SpatialItem {
  return {
    id,
    rect: {
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
    },
  };
}

describe('spatial navigation', () => {
  it('moves by visual direction in a row-based grid', () => {
    const items = [
      item('a', 0, 0),
      item('b', 120, 0),
      item('c', 240, 0),
      item('d', 0, 100),
      item('e', 120, 100),
      item('f', 240, 100),
    ];

    expect(getNextSpatialItemId({ items, currentId: 'a', direction: 'right' })).toBe('b');
    expect(getNextSpatialItemId({ items, currentId: 'a', direction: 'down' })).toBe('d');
    expect(getNextSpatialItemId({ items, currentId: 'e', direction: 'left' })).toBe('d');
    expect(getNextSpatialItemId({ items, currentId: 'e', direction: 'up' })).toBe('b');
  });

  it('moves vertically within a column before considering another column', () => {
    const items = [
      item('a', 0, 0),
      item('b', 0, 100),
      item('c', 0, 200),
      item('d', 140, 0),
      item('e', 140, 100),
      item('f', 140, 200),
    ];

    expect(getNextSpatialItemId({ items, currentId: 'd', direction: 'down' })).toBe('e');
    expect(getNextSpatialItemId({ items, currentId: 'e', direction: 'left' })).toBe('b');
    expect(getNextSpatialItemId({ items, currentId: 'b', direction: 'right' })).toBe('e');
    expect(getNextSpatialItemId({ items, currentId: 'e', direction: 'up' })).toBe('d');
  });

  it('uses nearest perpendicular alignment when card heights are uneven', () => {
    const items = [
      item('a', 0, 0, 100, 140),
      item('b', 130, 0, 100, 60),
      item('c', 130, 80, 100, 60),
      item('d', 0, 170, 100, 80),
    ];

    expect(getNextSpatialItemId({ items, currentId: 'a', direction: 'right' })).toBe('b');
    expect(getNextSpatialItemId({ items, currentId: 'c', direction: 'left' })).toBe('a');
    expect(getNextSpatialItemId({ items, currentId: 'a', direction: 'down' })).toBe('d');
  });

  it('does not wrap at visual edges', () => {
    const items = [
      item('a', 0, 0),
      item('b', 120, 0),
    ];

    expect(getNextSpatialItemId({ items, currentId: 'a', direction: 'left' })).toBe('a');
    expect(getNextSpatialItemId({ items, currentId: 'b', direction: 'right' })).toBe('b');
  });

  it('falls back to the first item when the current item is missing', () => {
    const items = [
      item('a', 0, 0),
      item('b', 120, 0),
    ];

    expect(getNextSpatialItemId({ items, currentId: null, direction: 'right' })).toBe('b');
    expect(getNextSpatialItemId({ items, currentId: 'missing', direction: 'left' })).toBe('a');
  });

  it('returns null when there are no navigable items', () => {
    expect(getNextSpatialItemId({ items: [], currentId: null, direction: 'down' })).toBeNull();
  });
});
