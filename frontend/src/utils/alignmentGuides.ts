/**
 * Smart Alignment Guides Utility
 * 
 * Provides snapping and alignment guide detection for precision element placement.
 * When dragging elements, guides appear when edges or centers align with other elements.
 * 
 * @module alignmentGuides
 */

import type { DrawingElement, Point } from '../types/canvas';

/**
 * Represents a single alignment guide line
 */
export interface AlignmentGuide {
  /** Type of alignment: edge or center */
  type: 'edge' | 'center';
  /** Position of the guide line in pixels */
  position: number;
  /** Axis of the guide: horizontal or vertical */
  axis: 'horizontal' | 'vertical';
  /** The element this guide snaps to */
  sourceElementId: string;
}

/**
 * Result of alignment guide detection
 */
export interface AlignmentResult {
  /** Array of detected alignment guides */
  guides: AlignmentGuide[];
  /** Snapped position for the moving element */
  snappedPosition: Point;
  /** Whether any snapping occurred */
  didSnap: boolean;
}

/**
 * Get the bounding box of an element
 */
export function getElementBounds(element: DrawingElement): {
  x: number; y: number; width: number; height: number;
  centerX: number; centerY: number;
  right: number; bottom: number;
} | null {
  if (element.x !== undefined && element.y !== undefined) {
    const w = Math.abs(element.width || 0);
    const h = Math.abs(element.height || 0);
    const x = element.width !== undefined && element.width < 0 ? element.x + element.width : element.x;
    const y = element.height !== undefined && element.height < 0 ? element.y + element.height : element.y;
    return {
      x, y, width: w, height: h,
      centerX: x + w / 2,
      centerY: y + h / 2,
      right: x + w,
      bottom: y + h,
    };
  }

  // For pencil/line elements, compute bounding box from points
  if (element.points && element.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of element.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const w = maxX - minX;
    const h = maxY - minY;
    return {
      x: minX, y: minY, width: w, height: h,
      centerX: minX + w / 2,
      centerY: minY + h / 2,
      right: maxX,
      bottom: maxY,
    };
  }

  return null;
}

/**
 * Find alignment guides between a moving element and other elements on the canvas.
 * 
 * @param movingElement - The element being dragged
 * @param movingPosition - Current position of the moving element
 * @param otherElements - All other elements to check alignment against
 * @param threshold - Pixel distance within which snapping occurs (default: 5)
 * @returns AlignmentResult with guides and snapped position
 * 
 * @example
 * ```typescript
 * const result = findAlignmentGuides(
 *   draggedRect,
 *   { x: mouseX, y: mouseY },
 *   allOtherElements,
 *   5
 * );
 * if (result.didSnap) {
 *   element.x = result.snappedPosition.x;
 *   element.y = result.snappedPosition.y;
 * }
 * ```
 */
export function findAlignmentGuides(
  movingElement: DrawingElement,
  movingPosition: Point,
  otherElements: DrawingElement[],
  threshold: number = 5
): AlignmentResult {
  const guides: AlignmentGuide[] = [];
  let snappedX = movingPosition.x;
  let snappedY = movingPosition.y;
  let didSnapX = false;
  let didSnapY = false;

  const movingBounds = getElementBounds({
    ...movingElement,
    x: movingPosition.x,
    y: movingPosition.y,
  });

  if (!movingBounds) {
    return { guides, snappedPosition: movingPosition, didSnap: false };
  }

  for (const other of otherElements) {
    if (other.id === movingElement.id) continue;
    const otherBounds = getElementBounds(other);
    if (!otherBounds) continue;

    // Check vertical alignment (X axis)
    const xChecks = [
      { movingVal: movingBounds.x, otherVal: otherBounds.x, type: 'edge' as const },
      { movingVal: movingBounds.right, otherVal: otherBounds.right, type: 'edge' as const },
      { movingVal: movingBounds.x, otherVal: otherBounds.right, type: 'edge' as const },
      { movingVal: movingBounds.right, otherVal: otherBounds.x, type: 'edge' as const },
      { movingVal: movingBounds.centerX, otherVal: otherBounds.centerX, type: 'center' as const },
    ];

    for (const check of xChecks) {
      const diff = Math.abs(check.movingVal - check.otherVal);
      if (diff < threshold && !didSnapX) {
        const offset = check.otherVal - check.movingVal;
        snappedX = movingPosition.x + offset;
        didSnapX = true;
        guides.push({
          type: check.type,
          position: check.otherVal,
          axis: 'vertical',
          sourceElementId: other.id,
        });
      }
    }

    // Check horizontal alignment (Y axis)
    const yChecks = [
      { movingVal: movingBounds.y, otherVal: otherBounds.y, type: 'edge' as const },
      { movingVal: movingBounds.bottom, otherVal: otherBounds.bottom, type: 'edge' as const },
      { movingVal: movingBounds.y, otherVal: otherBounds.bottom, type: 'edge' as const },
      { movingVal: movingBounds.bottom, otherVal: otherBounds.y, type: 'edge' as const },
      { movingVal: movingBounds.centerY, otherVal: otherBounds.centerY, type: 'center' as const },
    ];

    for (const check of yChecks) {
      const diff = Math.abs(check.movingVal - check.otherVal);
      if (diff < threshold && !didSnapY) {
        const offset = check.otherVal - check.movingVal;
        snappedY = movingPosition.y + offset;
        didSnapY = true;
        guides.push({
          type: check.type,
          position: check.otherVal,
          axis: 'horizontal',
          sourceElementId: other.id,
        });
      }
    }
  }

  return {
    guides,
    snappedPosition: { x: snappedX, y: snappedY },
    didSnap: didSnapX || didSnapY,
  };
}
