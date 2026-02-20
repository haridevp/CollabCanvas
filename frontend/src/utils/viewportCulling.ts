import type { DrawingElement } from '../types/canvas';

/**
 * Check if an element is visible in the current viewport
 */
export function isElementInViewport(
    element: DrawingElement,
    viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
        zoom: number;
    },
    padding: number = 100 // Add padding to avoid popping at edges
): boolean {
    const { x: vx, y: vy, width: vw, height: vh, zoom } = viewport;

    // Apply zoom to viewport dimensions
    const viewportLeft = vx - padding / zoom;
    const viewportTop = vy - padding / zoom;
    const viewportRight = vx + vw / zoom + padding / zoom;
    const viewportBottom = vy + vh / zoom + padding / zoom;

    // Get element bounds
    let elementLeft: number, elementTop: number, elementRight: number, elementBottom: number;

    switch (element.type) {
        case 'rectangle':
        case 'circle':
        case 'image':
        case 'text':
            if (element.x === undefined || element.y === undefined ||
                element.width === undefined || element.height === undefined) {
                return false;
            }
            elementLeft = element.x;
            elementTop = element.y;
            elementRight = element.x + element.width;
            elementBottom = element.y + element.height;
            break;

        case 'line':
        case 'arrow':
        case 'pencil':
        case 'eraser': {
            if (!element.points || element.points.length === 0) return false;

            // Calculate bounding box of points
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            element.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });

            // Add padding for stroke width
            const strokePadding = (element.strokeWidth || 1) * 2;
            elementLeft = minX - strokePadding;
            elementTop = minY - strokePadding;
            elementRight = maxX + strokePadding;
            elementBottom = maxY + strokePadding;
            break;
        }

        default:
            return false;
    }

    // Check for intersection
    return !(
        elementRight < viewportLeft ||
        elementBottom < viewportTop ||
        elementLeft > viewportRight ||
        elementTop > viewportBottom
    );
}

/**
 * Get visible elements for current viewport
 */
export function getVisibleElements(
    elements: DrawingElement[],
    viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
        zoom: number;
    }
): DrawingElement[] {
    return elements.filter(el => isElementInViewport(el, viewport));
}

/**
 * Calculate visible region for debugging
 */
export function getViewportStats(
    elements: DrawingElement[],
    viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
        zoom: number;
    }
): { total: number; visible: number; percentage: number } {
    const visible = getVisibleElements(elements, viewport).length;
    return {
        total: elements.length,
        visible,
        percentage: elements.length > 0 ? (visible / elements.length) * 100 : 0
    };
}