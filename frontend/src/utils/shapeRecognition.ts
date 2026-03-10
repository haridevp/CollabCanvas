import { Point, DrawingElement } from '../types/canvas';

// Local math helper
const distanceBetween = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

/**
 * Re-evaluate a set of raw pencil points to see if they roughly form a
 * standard geometric shape (Line, Rectangle, Circle, Triangle).
 */
export const recognizeShape = (
  points: Point[],
  originalElement: DrawingElement
): DrawingElement | null => {
  if (points.length < 8) return null;

  const startPt = points[0];
  const endPt = points[points.length - 1];
  const distStartEnd = distanceBetween(startPt, endPt);

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const boundingDiag = Math.sqrt(width * width + height * height);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;
  
  // Total path length
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    pathLength += distanceBetween(points[i - 1], points[i]);
  }

  // 1. LINE DETECTION
  const lineTolerance = 1.15; 
  if (pathLength < distStartEnd * lineTolerance && distStartEnd > 20) {
    return {
      ...originalElement,
      type: 'line',
      points: [startPt, endPt]
    } as any;
  }

  // 2. CLOSED SHAPE DETECTION
  const isClosed = distStartEnd < Math.max(30, boundingDiag * 0.3);
  
  if (isClosed && points.length > 10) {
    // --- Circle/Ellipse Check ---
    const radius = (width + height) / 4;
    let totalDeviance = 0;
    points.forEach(p => {
      const d = distanceBetween(p, { x: centerX, y: centerY });
      totalDeviance += Math.abs(d - radius);
    });
    const avgDeviance = totalDeviance / points.length;

    // FIX: Add "rectangularity" check. 
    // A circle's area (πr²) vs bounding box area (4r²) should be ~0.785
    // A rectangle's area vs bounding box area is ~1.0
    // We use path length as a proxy for perimeter.
    const circlePerimeter = 2 * Math.PI * radius;
    const rectPerimeter = 2 * (width + height);
    
    // If it's much closer to a circle's perimeter and has low deviance
    if (avgDeviance < radius * 0.2 && Math.abs(pathLength - circlePerimeter) < Math.abs(pathLength - rectPerimeter)) {
      return {
        ...originalElement,
        type: 'circle',
        x: centerX,
        y: centerY,
        width: width / 2,
        height: height / 2,
        points: undefined
      } as any;
    }

    // --- Triangle Check ---
    // Look for 3 sharp corners
    const corners: number[] = [0];
    for (let i = 2; i < points.length - 2; i++) {
        const p1 = points[i-2];
        const p2 = points[i];
        const p3 = points[i+2];
        
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        const angle = Math.acos(dot / (mag1 * mag2));
        
        // If angle is sharp (< 100 degrees)
        if (angle < 1.8) { // ~103 degrees
            // Check if this is far enough from the last corner
            if (i - corners[corners.length - 1] > points.length / 10) {
                corners.push(i);
            }
        }
    }
    
    // A triangle should have roughly 3 corners (plus start/end)
    if (corners.length >= 3 && corners.length <= 4) {
        return {
            ...originalElement,
            type: 'triangle',
            x: minX,
            y: minY,
            width: width,
            height: height,
            points: undefined
        } as any;
    }

    // --- Rectangle Check (Fallback) ---
    if (pathLength < rectPerimeter * 1.3) {
      return {
        ...originalElement,
        type: 'rectangle',
        x: minX,
        y: minY,
        width: width,
        height: height,
        points: undefined
      } as any;
    }
  }

  return null;
};

/**
 * Recognizes common gestures from a set of points.
 * Returns 'delete' for scribbles/zig-zags over an area.
 */
export const recognizeGesture = (points: Point[]): 'delete' | 'check' | null => {
  if (points.length < 12) return null;

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  const width = maxX - minX;
  const height = maxY - minY;

  // Total path length vs bounding box size
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    pathLength += distanceBetween(points[i - 1], points[i]);
  }

  // Direction changes (Scribble detection)
  let xDirectionChanges = 0;
  let yDirectionChanges = 0;
  let lastXDir = 0;
  let lastYDir = 0;

  for (let i = 2; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;

    if (Math.abs(dx) > 2) {
      const dir = dx > 0 ? 1 : -1;
      if (lastXDir !== 0 && dir !== lastXDir) xDirectionChanges++;
      lastXDir = dir;
    }
    if (Math.abs(dy) > 2) {
      const dir = dy > 0 ? 1 : -1;
      if (lastYDir !== 0 && dir !== lastYDir) yDirectionChanges++;
      lastYDir = dir;
    }
  }

  // ============== DELETE GESTURE (Scribble) ==============
  const isScribble = (xDirectionChanges + yDirectionChanges) >= 5 && pathLength > (width + height) * 1.5;
  
  if (isScribble) {
    return 'delete';
  }

  // ============== CHECKMARK GESTURE ==============
  const startPt = points[0];
  const endPt = points[points.length - 1];
  
  let lowestPt = points[0];
  let lowestIdx = 0;
  points.forEach((p, i) => {
    if (p.y > lowestPt.y) {
      lowestPt = p;
      lowestIdx = i;
    }
  });

  if (lowestIdx > 2 && lowestIdx < points.length - 3) {
    const isDownRight = lowestPt.x > startPt.x && lowestPt.y > startPt.y;
    const isUpRight = endPt.x > lowestPt.x && endPt.y < lowestPt.y;
    const secondStrokeLonger = distanceBetween(lowestPt, endPt) > distanceBetween(startPt, lowestPt) * 0.5;

    if (isDownRight && isUpRight && secondStrokeLonger) {
      return 'check';
    }
  }

  return null;
};
