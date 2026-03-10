/**
 * Dimension Lines Utility
 * 
 * Provides dimension line creation and rendering helpers for technical
 * drawings. Dimension lines show the measured distance between two points
 * with extension lines, arrows, and a measurement label.
 * 
 * @module dimensionLines
 */

import type { Point } from '../types/canvas';

/**
 * Unit types for dimension measurements
 */
export type DimensionUnit = 'px' | 'mm' | 'cm' | 'in' | 'pt';

/**
 * Represents a complete dimension line with all rendering geometry
 */
export interface DimensionLineData {
  /** Start point of the measurement */
  start: Point;
  /** End point of the measurement */
  end: Point;
  /** Extension line start points (perpendicular to measurement) */
  extensionLineStart1: Point;
  extensionLineEnd1: Point;
  extensionLineStart2: Point;
  extensionLineEnd2: Point;
  /** The dimension line itself (offset from the measured edge) */
  dimensionLineStart: Point;
  dimensionLineEnd: Point;
  /** Position for the measurement text label */
  labelPosition: Point;
  /** Formatted measurement text */
  labelText: string;
  /** Angle of the dimension line in radians */
  angle: number;
  /** Raw pixel distance */
  pixelLength: number;
}

/**
 * Scale configuration for converting pixels to real-world units
 */
export interface DimensionScale {
  /** Pixels per unit (e.g., 96 for 96 DPI) */
  pixelsPerUnit: number;
  /** Display unit */
  unit: DimensionUnit;
}

const UNIT_NAMES: Record<DimensionUnit, string> = {
  px: 'px',
  mm: 'mm',
  cm: 'cm',
  in: 'in',
  pt: 'pt',
};

/**
 * Create a dimension line between two points with extension lines.
 * 
 * @param start - Start point of measurement
 * @param end - End point of measurement
 * @param offset - Distance to offset the dimension line from the measured edge (default: 30)
 * @param scale - Optional scale for unit conversion
 * @returns DimensionLineData with all geometry needed for rendering
 * 
 * @example
 * ```typescript
 * const dim = createDimensionLine(
 *   { x: 50, y: 100 },
 *   { x: 250, y: 100 },
 *   30
 * );
 * // dim.labelText === "200 px"
 * ```
 */
export function createDimensionLine(
  start: Point,
  end: Point,
  offset: number = 30,
  scale?: DimensionScale
): DimensionLineData {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const pixelLength = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Perpendicular direction for the offset
  const perpX = -Math.sin(angle) * offset;
  const perpY = Math.cos(angle) * offset;

  // Extension line geometry
  const extensionExtra = 5; // How far extension lines extend beyond dimension line
  const extensionLineStart1 = { x: start.x, y: start.y };
  const extensionLineEnd1 = {
    x: start.x + perpX + (-Math.sin(angle) * extensionExtra),
    y: start.y + perpY + (Math.cos(angle) * extensionExtra),
  };
  const extensionLineStart2 = { x: end.x, y: end.y };
  const extensionLineEnd2 = {
    x: end.x + perpX + (-Math.sin(angle) * extensionExtra),
    y: end.y + perpY + (Math.cos(angle) * extensionExtra),
  };

  // Dimension line (offset from measured edge)
  const dimensionLineStart = {
    x: start.x + perpX,
    y: start.y + perpY,
  };
  const dimensionLineEnd = {
    x: end.x + perpX,
    y: end.y + perpY,
  };

  // Label position (midpoint of dimension line)
  const labelPosition = {
    x: (dimensionLineStart.x + dimensionLineEnd.x) / 2,
    y: (dimensionLineStart.y + dimensionLineEnd.y) / 2,
  };

  const labelText = formatDimension(pixelLength, scale);

  return {
    start,
    end,
    extensionLineStart1,
    extensionLineEnd1,
    extensionLineStart2,
    extensionLineEnd2,
    dimensionLineStart,
    dimensionLineEnd,
    labelPosition,
    labelText,
    angle,
    pixelLength,
  };
}

/**
 * Format a pixel measurement into a display string with units.
 * 
 * @param pixelLength - Length in pixels
 * @param scale - Optional scale for unit conversion
 * @param precision - Decimal places (default: 1)
 * @returns Formatted dimension string
 */
export function formatDimension(
  pixelLength: number,
  scale?: DimensionScale,
  precision: number = 1
): string {
  if (!scale) {
    return `${Math.round(pixelLength)} px`;
  }

  const value = pixelLength / scale.pixelsPerUnit;
  return `${value.toFixed(precision)} ${UNIT_NAMES[scale.unit]}`;
}

/**
 * Get all geometry points needed to render a dimension line.
 * This is a convenience wrapper that returns arrays suitable for canvas drawing.
 * 
 * @param start - Start point
 * @param end - End point
 * @param offset - Offset distance
 * @returns Object with line arrays and label info
 */
export function getDimensionLineGeometry(
  start: Point,
  end: Point,
  offset: number = 30
): {
  extensionLines: [Point, Point][];
  dimensionLine: [Point, Point];
  arrowheads: { point: Point; angle: number }[];
  label: { position: Point; text: string; angle: number };
} {
  const dim = createDimensionLine(start, end, offset);

  return {
    extensionLines: [
      [dim.extensionLineStart1, dim.extensionLineEnd1],
      [dim.extensionLineStart2, dim.extensionLineEnd2],
    ],
    dimensionLine: [dim.dimensionLineStart, dim.dimensionLineEnd],
    arrowheads: [
      { point: dim.dimensionLineStart, angle: dim.angle },
      { point: dim.dimensionLineEnd, angle: dim.angle + Math.PI },
    ],
    label: {
      position: dim.labelPosition,
      text: dim.labelText,
      angle: dim.angle,
    },
  };
}

/**
 * Calculate the area of a rectangle from its dimensions.
 * Useful for showing area in dimension annotations.
 */
export function calculateArea(
  width: number,
  height: number,
  scale?: DimensionScale
): string {
  if (!scale) {
    return `${Math.round(width * height)} px²`;
  }
  const w = width / scale.pixelsPerUnit;
  const h = height / scale.pixelsPerUnit;
  return `${(w * h).toFixed(2)} ${UNIT_NAMES[scale.unit]}²`;
}
