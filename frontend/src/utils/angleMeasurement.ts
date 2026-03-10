/**
 * Angle Measurement Utility
 * 
 * Provides angle calculation, formatting, and rendering helpers for
 * measuring angles between lines on the canvas.
 * 
 * @module angleMeasurement
 */

import type { Point } from '../types/canvas';

/**
 * Calculate the angle in degrees between two lines meeting at a vertex point.
 * 
 * @param pointA - First endpoint
 * @param vertex - The point where both lines meet
 * @param pointB - Second endpoint
 * @returns Angle in degrees (0-360)
 * 
 * @example
 * ```typescript
 * const angle = calculateAngle(
 *   { x: 100, y: 0 },
 *   { x: 0, y: 0 },
 *   { x: 0, y: 100 }
 * );
 * // angle === 90
 * ```
 */
export function calculateAngle(pointA: Point, vertex: Point, pointB: Point): number {
  const angleA = Math.atan2(pointA.y - vertex.y, pointA.x - vertex.x);
  const angleB = Math.atan2(pointB.y - vertex.y, pointB.x - vertex.x);

  let angle = (angleB - angleA) * (180 / Math.PI);

  // Normalize to 0-360
  if (angle < 0) angle += 360;

  return angle;
}

/**
 * Calculate the interior angle (always returns the smaller angle ≤ 180°)
 */
export function calculateInteriorAngle(pointA: Point, vertex: Point, pointB: Point): number {
  const angle = calculateAngle(pointA, vertex, pointB);
  return angle > 180 ? 360 - angle : angle;
}

/**
 * Format an angle value for display
 * 
 * @param degrees - Angle in degrees
 * @param precision - Decimal places (default: 1)
 * @returns Formatted string like "45.0°"
 */
export function formatAngle(degrees: number, precision: number = 1): string {
  return `${degrees.toFixed(precision)}°`;
}

/**
 * Generate SVG arc path data for rendering an angle arc indicator.
 * 
 * @param vertex - Center point of the arc (where the angle is)
 * @param radius - Radius of the arc in pixels
 * @param startAngle - Starting angle in radians
 * @param endAngle - Ending angle in radians
 * @returns SVG path data string for the arc
 */
export function getAngleArcPath(
  vertex: Point,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const startX = vertex.x + radius * Math.cos(startAngle);
  const startY = vertex.y + radius * Math.sin(startAngle);
  const endX = vertex.x + radius * Math.cos(endAngle);
  const endY = vertex.y + radius * Math.sin(endAngle);

  let angleDiff = endAngle - startAngle;
  if (angleDiff < 0) angleDiff += 2 * Math.PI;
  const largeArcFlag = angleDiff > Math.PI ? 1 : 0;
  const sweepFlag = 1;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
}

/**
 * Get the label position for an angle measurement (midpoint of the arc).
 * 
 * @param vertex - Center point
 * @param radius - Distance from vertex for the label
 * @param startAngle - Start angle in radians
 * @param endAngle - End angle in radians
 * @returns Point where the angle label should be positioned
 */
export function getAngleLabelPosition(
  vertex: Point,
  radius: number,
  startAngle: number,
  endAngle: number
): Point {
  let midAngle = (startAngle + endAngle) / 2;
  // If the arc wraps around, adjust the midpoint
  if (endAngle < startAngle) {
    midAngle = (startAngle + endAngle + 2 * Math.PI) / 2;
  }

  return {
    x: vertex.x + radius * Math.cos(midAngle),
    y: vertex.y + radius * Math.sin(midAngle),
  };
}

/**
 * Calculate angles from lines on the canvas between two points.
 * Returns the angle relative to the horizontal axis.
 */
export function getLineAngle(start: Point, end: Point): number {
  const angleRad = Math.atan2(end.y - start.y, end.x - start.x);
  let angleDeg = angleRad * (180 / Math.PI);
  if (angleDeg < 0) angleDeg += 360;
  return angleDeg;
}
