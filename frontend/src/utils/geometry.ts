import type { Point, DrawingElement } from '../types/canvas';

/**
 * Calculate distance from point to line segment
 */
export const distanceToLineSegment = (p: Point, a: Point, b: Point): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);

    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const proj = {
        x: a.x + t * dx,
        y: a.y + t * dy
    };

    return Math.sqrt((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2);
};

/**
 * Check if a point is inside an element
 */
export const isPointInElement = (point: Point, element: DrawingElement): boolean => {
    const tolerance = 10;

    switch (element.type) {
        case 'rectangle':
        case 'image':
        case 'text':
            if (element.x !== undefined && element.y !== undefined &&
                element.width !== undefined && element.height !== undefined) {
                return (
                    point.x >= element.x &&
                    point.x <= element.x + element.width &&
                    point.y >= element.y &&
                    point.y <= element.y + element.height
                );
            }
            break;

        case 'circle':
            if (element.x !== undefined && element.y !== undefined &&
                element.width !== undefined && element.height !== undefined) {
                const centerX = element.x + element.width / 2;
                const centerY = element.y + element.height / 2;
                const radiusX = element.width / 2;
                const radiusY = element.height / 2;

                // Ellipse hit test
                const dx = (point.x - centerX) / radiusX;
                const dy = (point.y - centerY) / radiusY;
                return (dx * dx + dy * dy) <= 1;
            }
            break;

        case 'line':
        case 'arrow':
            if (element.points && element.points.length === 2) {
                const [start, end] = element.points;
                // Simple line hit test (distance to line segment)
                const d = distanceToLineSegment(point, start, end);
                return d < tolerance;
            }
            break;

        case 'pencil':
        case 'eraser':
            if (element.points) {
                // Check distance to any point in the stroke
                for (const p of element.points) {
                    const dx = point.x - p.x;
                    const dy = point.y - p.y;
                    if (Math.sqrt(dx * dx + dy * dy) < tolerance) {
                        return true;
                    }
                }
            }
            break;
    }

    return false;
};
