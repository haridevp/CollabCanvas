import { isPointInElement } from './geometry';
import type { DrawingElement, Point, ImageElement, TextElement } from '../types/canvas';

// Re-implement distanceBetween since it might be missing from geometry.ts exports if the file was recently recreated
const distanceBetween = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

/**
 * Wand tool threshold parameter. Max pixel distance an element can be from
 * a point or other clustered element to be "grouped" via Magic Wand.
 */
const WAND_TOLERANCE = 50; 

/**
 * Returns the bounding centers of various element types to determine clustering.
 */
const getElementBoundings = (el: DrawingElement): {centerX: number, centerY: number, maxRadius: number} => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    // Calculate actual bounds safely based on type and coordinates
    if (el.type === 'pencil' || el.type === 'line' || el.type === 'arrow' || el.type === 'eraser') {
        if (el.points && el.points.length > 0) {
            el.points.forEach(p => {
              minX = Math.min(minX, p.x);
              minY = Math.min(minY, p.y);
              maxX = Math.max(maxX, p.x);
              maxY = Math.max(maxY, p.y);
            });
        }
    } else if (el.type === 'rectangle' || el.type === 'circle' || el.type === 'image') {
        // Shapes with x, y, width, height
        const bx = el.x || 0;
        const by = el.y || 0;
        const width = el.width || 0;
        const height = el.height || 0;
        
        if (width < 0) minX = Math.min(minX, bx + width); else minX = bx;
        if (height < 0) minY = Math.min(minY, by + height); else minY = by;
        maxX = Math.max(maxX, bx + Math.abs(width), bx);
        maxY = Math.max(maxY, by + Math.abs(height), by);
    } else if (el.type === 'text') {
        minX = el.x || 0;
        minY = el.y || 0;
        maxX = (el.x || 0) + (el.width || 50);
        maxY = (el.y || 0) + (el.height || 20);
    }

    if (minX === Infinity) {
        minX = el.x || 0; minY = el.y || 0; maxX = el.x || 0; maxY = el.y || 0;
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const maxRadius = Math.max((maxX - minX) / 2, (maxY - minY) / 2);

    return { centerX, centerY, maxRadius };
};

/**
 * Segments visually contiguous elements on the canvas (Magic Wand).
 * Algorithm:
 * 1. Find elements directly colliding with the clicked point.
 * 2. If no direct collision occurs, find the *closest* element within `WAND_TOLERANCE`.
 * 3. Starting from the seed element(s), expand outwards combining adjacent elements
 *    whose bounding box edges or cluster distances are within WAND_TOLERANCE.
 */
export const performMagicWandSelection = (
    clickPoint: Point, 
    allElements: DrawingElement[], 
    zoomLevel: number = 1
): string[] => {
    // 1. Identify seed element
    let seedIds = new Set<string>();

    // First try exact hit test
    for (let i = allElements.length - 1; i >= 0; i--) {
        const el = allElements[i];
        if (isPointInElement(clickPoint, el)) {
            seedIds.add(el.id);
            break; // Grab top-most hit
        }
    }

    // Proximity search if no exact hit
    if (seedIds.size === 0) {
        let closestDist = Infinity;
        let closestId: string | null = null;

        allElements.forEach(el => {
            const bounds = getElementBoundings(el);
            const dist = distanceBetween(clickPoint, { x: bounds.centerX, y: bounds.centerY });
            // Approximate distance to outer edge of element
            const edgeDist = Math.max(0, dist - bounds.maxRadius);
            
            if (edgeDist < (WAND_TOLERANCE / zoomLevel) && edgeDist < closestDist) {
                closestDist = edgeDist;
                closestId = el.id;
            }
        });

        if (closestId) {
            seedIds.add(closestId);
        }
    }

    if (seedIds.size === 0) return [];

    // 2. Expand Cluster
    const selectedIds = new Set<string>(seedIds);
    let newlyAdded = true;

    // Cache element bounds to avoid recomputing in O(N^2) loop
    const boundsCache = new Map<string, ReturnType<typeof getElementBoundings>>();
    allElements.forEach(el => boundsCache.set(el.id, getElementBoundings(el)));

    // Iterative flood-fill
    while (newlyAdded) {
        newlyAdded = false;

        allElements.forEach(el => {
            if (selectedIds.has(el.id)) return;

            const elBounds = boundsCache.get(el.id)!;
            
            // Check distance against all *currently clustered* elements
            for (const clusteredId of selectedIds) {
                const clusterBounds = boundsCache.get(clusteredId)!;
                const dist = distanceBetween(
                    { x: elBounds.centerX, y: elBounds.centerY },
                    { x: clusterBounds.centerX, y: clusterBounds.centerY }
                );
                
                // If the gap between their bounding radii is smaller than WAND_TOLERANCE, group them
                const gap = dist - elBounds.maxRadius - clusterBounds.maxRadius;
                
                if (gap <= (WAND_TOLERANCE / zoomLevel)) {
                    selectedIds.add(el.id);
                    newlyAdded = true;
                    break; 
                }
            }
        });
    }

    return Array.from(selectedIds);
};
