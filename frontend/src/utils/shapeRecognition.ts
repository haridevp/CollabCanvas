import { Point, DrawingElement } from '../types/canvas';
// Local math helper
const distanceBetween = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

/**
 * Re-evaluate a set of raw pencil points to see if they roughly form a
 * standard geometric shape (Line, Rectangle, Circle). If so, returns a
 * new Element representing that perfect shape.
 * 
 * Line detection: If ends are far apart, but total point deviation from
 * the best-fit line is low.
 * Circle detection: If start/end points meet (closed loop) and variance
 * in boundary-to-center distance is low.
 * Rectangle: If start/end points meet (closed loop) and 4 distinct corners
 * can be roughly identified or bounds roughly match bounding box.
 */
export const recognizeShape = (
  points: Point[],
  originalElement: DrawingElement
): DrawingElement | null => {
  if (points.length < 10) return null; // Too few points to guess

  const startPt = points[0];
  const endPt = points[points.length - 1];
  const distStartEnd = distanceBetween(startPt, endPt);

  // Calculate bounding box for the stroke
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
  const isClosed = distStartEnd < (boundingDiag * 0.15); // End is very close to start

  // Total path length
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    pathLength += distanceBetween(points[i - 1], points[i]);
  }

  // ============== LINE DETECTION ==============
  // If the stroke is straight, path length should be very close to direct start-to-end dist
  if (!isClosed && pathLength < distStartEnd * 1.15) {
    return {
      ...originalElement,
      id: originalElement.id,
      type: 'line',
      points: [startPt, endPt]
    } as any;
  }

  // ============== CLOSED SHAPE DETECTION ==============
  if (isClosed) {
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    // Check if it's a circle/ellipse
    // A circle has roughly equal distance from center to all points.
    // An ellipse has distance matching the (x/a)^2 + (y/b)^2 = 1 curve.
    // For simplicity, we check if the path length is close to the ellipse circumference approximation.
    const a = width / 2;
    const b = height / 2;
    // Ramanujan approximation for ellipse circumference
    const approxCircumference = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));

    // Check variance of radius if it's roughly circular
    let rVariance = 0;
    const expectedRadius = (a + b) / 2;
    points.forEach(p => {
      const r = distanceBetween(p, { x: centerX, y: centerY });
      rVariance += Math.pow(r - expectedRadius, 2);
    });
    rVariance /= points.length;

    // If circumference matches AND radius variance is relatively low compared to size
    if (Math.abs(pathLength - approxCircumference) < (approxCircumference * 0.2) && Math.sqrt(rVariance) < (expectedRadius * 0.3)) {
      return {
        ...originalElement,
        id: originalElement.id,
        type: 'circle',
        x: minX,
        y: minY,
        width: width,
        height: height,
        points: undefined
      } as any;
    }

    // Check if it's a rectangle
    // Rectangle perimeter = 2 * (w + h)
    const expectedPerimeter = 2 * (width + height);
    if (Math.abs(pathLength - expectedPerimeter) < (expectedPerimeter * 0.2)) {
      // Further check: points should mostly lie on the bounding box edges
      let pointsOnEdge = 0;
      const edgeThreshold = Math.max(10, boundingDiag * 0.05);

      points.forEach(p => {
        const onLeft = Math.abs(p.x - minX) < edgeThreshold;
        const onRight = Math.abs(p.x - maxX) < edgeThreshold;
        const onTop = Math.abs(p.y - minY) < edgeThreshold;
        const onBottom = Math.abs(p.y - maxY) < edgeThreshold;

        if (onLeft || onRight || onTop || onBottom) {
          pointsOnEdge++;
        }
      });

      if (pointsOnEdge / points.length > 0.8) { // 80% of points are on/near bounds
        return {
          ...originalElement,
          id: originalElement.id,
          type: 'rectangle',
          x: minX,
          y: minY,
          width: width,
          height: height,
          points: undefined
        } as any;
      }
    }
  }

  // Fallback: Return null if no shape was confidently recognized
  return null;
};
