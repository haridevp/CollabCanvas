import { Point, DrawingElement } from '../types/canvas';

// Local math helper
const distanceBetween = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

/**
 * Re-evaluate a set of raw pencil points to see if they roughly form a
 * standard geometric shape (Line, Rectangle, Circle). If so, returns a
 * new Element representing that perfect shape.
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
  
  // Total path length
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    pathLength += distanceBetween(points[i - 1], points[i]);
  }

  // 1. LINE DETECTION
  // A line is straight if path length is very close to start-to-end distance
  const lineTolerance = 1.12; 
  if (pathLength < distStartEnd * lineTolerance && distStartEnd > 20) {
    return {
      ...originalElement,
      type: 'line',
      points: [startPt, endPt]
    } as any;
  }

  // 2. CLOSED SHAPE DETECTION (Circle, Rectangle)
  const isClosed = distStartEnd < Math.max(25, boundingDiag * 0.25);

  if (isClosed && points.length > 12) {
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;
    const radius = (width + height) / 4;

    // --- Circle/Ellipse Check ---
    // Check how much each point deviates from the average radius
    let totalDeviance = 0;
    points.forEach(p => {
      const d = distanceBetween(p, { x: centerX, y: centerY });
      totalDeviance += Math.abs(d - radius);
    });
    const avgDeviance = totalDeviance / points.length;
    
    // Low deviance means it's likely a circle or ellipse
    if (avgDeviance < radius * 0.22) {
      return {
        ...originalElement,
        type: 'circle',
        x: minX + width / 2,
        y: minY + height / 2,
        width: width / 2, // In our types, circle uses x,y as center and width/height as radii? 
        height: height / 2, // Actually, current implementation in CollaborativeCanvas uses width/height as vector for radius
        points: undefined
      } as any;
    }

    // --- Rectangle Check ---
    // If it's not a circle, check if it fits a rectangle
    // Points should be concentrated near the corners or edges
    const perimeter = 2 * (width + height);
    if (pathLength < perimeter * 1.3 && pathLength > perimeter * 0.7) {
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

  // 3. TRIANGLE DETECTION (Optional but nice)
  // If it has 3 distinct corners and is closed... 
  // (Omitted for brevity unless requested, focusing on improving existing)

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
  // High density of points and many direction changes in a small-ish area
  // If we have many direction changes relative to the distance covered
  const isScribble = (xDirectionChanges + yDirectionChanges) >= 5 && pathLength > (width + height) * 2;
  
  if (isScribble) {
    return 'delete';
  }

  // ============== CHECKMARK GESTURE ==============
  const startPt = points[0];
  const endPt = points[points.length - 1];
  
  // Find the lowest point (the vertex of the checkmark)
  let lowestPt = points[0];
  let lowestIdx = 0;
  points.forEach((p, i) => {
    if (p.y > lowestPt.y) {
      lowestPt = p;
      lowestIdx = i;
    }
  });

  // Checkmark: down-right then up-right
  const firstHalf = points.slice(0, lowestIdx);
  const secondHalf = points.slice(lowestIdx);

  if (lowestIdx > 2 && lowestIdx < points.length - 3) {
    const isDownRight = lowestPt.x > startPt.x && lowestPt.y > startPt.y;
    const isUpRight = endPt.x > lowestPt.x && endPt.y < lowestPt.y;
    const secondStrokeLonger = distanceBetween(lowestPt, endPt) > distanceBetween(startPt, lowestPt);

    if (isDownRight && isUpRight && secondStrokeLonger) {
      return 'check';
    }
  }

  return null;
};
