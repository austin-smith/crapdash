export type SpatialDirection = 'up' | 'down' | 'left' | 'right';

export interface SpatialRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface SpatialItem {
  id: string;
  rect: SpatialRect;
}

interface RankedSpatialItem {
  item: SpatialItem;
  primaryDistance: number;
  perpendicularDistance: number;
  isAligned: boolean;
  documentOrder: number;
}

interface GetNextSpatialItemIdInput {
  items: SpatialItem[];
  currentId: string | null;
  direction: SpatialDirection;
}

const DIRECTION_EPSILON = 0.5;

function getCenterX(rect: SpatialRect): number {
  return rect.left + rect.width / 2;
}

function getCenterY(rect: SpatialRect): number {
  return rect.top + rect.height / 2;
}

function getAxisGap(
  currentStart: number,
  currentEnd: number,
  candidateStart: number,
  candidateEnd: number
): number {
  if (candidateEnd < currentStart) {
    return currentStart - candidateEnd;
  }

  if (candidateStart > currentEnd) {
    return candidateStart - currentEnd;
  }

  return 0;
}

function rangesOverlap(
  currentStart: number,
  currentEnd: number,
  candidateStart: number,
  candidateEnd: number
): boolean {
  return Math.min(currentEnd, candidateEnd) - Math.max(currentStart, candidateStart) > DIRECTION_EPSILON;
}

function getRankedSpatialItem(
  item: SpatialItem,
  current: SpatialItem,
  direction: SpatialDirection,
  documentOrder: number
): RankedSpatialItem | null {
  const currentRect = current.rect;
  const itemRect = item.rect;
  const currentCenterX = getCenterX(currentRect);
  const currentCenterY = getCenterY(currentRect);
  const itemCenterX = getCenterX(itemRect);
  const itemCenterY = getCenterY(itemRect);

  if (direction === 'down') {
    if (itemCenterY <= currentCenterY + DIRECTION_EPSILON) return null;

    return {
      item,
      primaryDistance: Math.max(0, itemRect.top - currentRect.bottom),
      perpendicularDistance: getAxisGap(currentRect.left, currentRect.right, itemRect.left, itemRect.right),
      isAligned: rangesOverlap(currentRect.left, currentRect.right, itemRect.left, itemRect.right),
      documentOrder,
    };
  }

  if (direction === 'up') {
    if (itemCenterY >= currentCenterY - DIRECTION_EPSILON) return null;

    return {
      item,
      primaryDistance: Math.max(0, currentRect.top - itemRect.bottom),
      perpendicularDistance: getAxisGap(currentRect.left, currentRect.right, itemRect.left, itemRect.right),
      isAligned: rangesOverlap(currentRect.left, currentRect.right, itemRect.left, itemRect.right),
      documentOrder,
    };
  }

  if (direction === 'right') {
    if (itemCenterX <= currentCenterX + DIRECTION_EPSILON) return null;

    return {
      item,
      primaryDistance: Math.max(0, itemRect.left - currentRect.right),
      perpendicularDistance: getAxisGap(currentRect.top, currentRect.bottom, itemRect.top, itemRect.bottom),
      isAligned: rangesOverlap(currentRect.top, currentRect.bottom, itemRect.top, itemRect.bottom),
      documentOrder,
    };
  }

  if (itemCenterX >= currentCenterX - DIRECTION_EPSILON) return null;

  return {
    item,
    primaryDistance: Math.max(0, currentRect.left - itemRect.right),
    perpendicularDistance: getAxisGap(currentRect.top, currentRect.bottom, itemRect.top, itemRect.bottom),
    isAligned: rangesOverlap(currentRect.top, currentRect.bottom, itemRect.top, itemRect.bottom),
    documentOrder,
  };
}

function compareRankedSpatialItems(a: RankedSpatialItem, b: RankedSpatialItem): number {
  if (a.isAligned !== b.isAligned) {
    return a.isAligned ? -1 : 1;
  }

  if (a.primaryDistance !== b.primaryDistance) {
    return a.primaryDistance - b.primaryDistance;
  }

  if (a.perpendicularDistance !== b.perpendicularDistance) {
    return a.perpendicularDistance - b.perpendicularDistance;
  }

  return a.documentOrder - b.documentOrder;
}

export function getNextSpatialItemId({
  items,
  currentId,
  direction,
}: GetNextSpatialItemIdInput): string | null {
  if (items.length === 0) {
    return null;
  }

  const current = items.find((item) => item.id === currentId) ?? items[0];
  const rankedItems: RankedSpatialItem[] = [];

  items.forEach((item, documentOrder) => {
    if (item.id === current.id) return;

    const rankedItem = getRankedSpatialItem(item, current, direction, documentOrder);
    if (rankedItem) {
      rankedItems.push(rankedItem);
    }
  });

  rankedItems.sort(compareRankedSpatialItems);

  return rankedItems[0]?.item.id ?? current.id;
}
