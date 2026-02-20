import type { DrawingElement, Point } from '../types/canvas';

/**
 * Grid-based spatial index for fast element lookup
 * Divides the canvas into cells and stores which elements overlap each cell
 */
export class SpatialIndex {
    private grid: Map<string, Set<string>> = new Map();
    private elementBounds: Map<string, { minX: number; minY: number; maxX: number; maxY: number }> = new Map();
    private cellSize: number;
    private elements: Map<string, DrawingElement> = new Map();

    constructor(cellSize: number = 100) {
        this.cellSize = cellSize;
    }

    /**
     * Get cell key for a given coordinate
     */
    private getCellKey(x: number, y: number): string {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX}:${cellY}`;
    }

    /**
     * Get all cells that an element overlaps
     */
    private getCellsForElement(element: DrawingElement): string[] {
        const bounds = this.getElementBounds(element);
        if (!bounds) return [];

        const cells = new Set<string>();

        const startCellX = Math.floor(bounds.minX / this.cellSize);
        const startCellY = Math.floor(bounds.minY / this.cellSize);
        const endCellX = Math.floor(bounds.maxX / this.cellSize);
        const endCellY = Math.floor(bounds.maxY / this.cellSize);

        for (let x = startCellX; x <= endCellX; x++) {
            for (let y = startCellY; y <= endCellY; y++) {
                cells.add(`${x}:${y}`);
            }
        }

        return Array.from(cells);
    }

    /**
     * Calculate bounding box for an element
     */
    private getElementBounds(element: DrawingElement): { minX: number; minY: number; maxX: number; maxY: number } | null {
        // Return cached bounds if available
        const cached = this.elementBounds.get(element.id);
        if (cached) return cached;

        let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

        switch (element.type) {
            case 'rectangle':
            case 'circle':
            case 'image':
            case 'text':
                if (element.x !== undefined && element.y !== undefined &&
                    element.width !== undefined && element.height !== undefined) {
                    bounds = {
                        minX: element.x,
                        minY: element.y,
                        maxX: element.x + element.width,
                        maxY: element.y + element.height
                    };
                }
                break;

            case 'line':
            case 'arrow':
            case 'pencil':
            case 'eraser':
                if (element.points && element.points.length > 0) {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    element.points.forEach(p => {
                        minX = Math.min(minX, p.x);
                        minY = Math.min(minY, p.y);
                        maxX = Math.max(maxX, p.x);
                        maxY = Math.max(maxY, p.y);
                    });
                    // Add padding for stroke width
                    const padding = (element.strokeWidth || 1) * 2;
                    bounds = {
                        minX: minX - padding,
                        minY: minY - padding,
                        maxX: maxX + padding,
                        maxY: maxY + padding
                    };
                }
                break;
        }

        if (bounds) {
            this.elementBounds.set(element.id, bounds);
        }

        return bounds;
    }

    /**
     * Insert or update an element in the spatial index
     */
    public insert(element: DrawingElement): void {
        // Remove old entry if exists
        this.remove(element.id);

        const bounds = this.getElementBounds(element);
        if (!bounds) return;

        // Store element
        this.elements.set(element.id, element);

        // Get cells this element overlaps
        const cells = this.getCellsForElement(element);

        // Add element to each cell
        cells.forEach(cellKey => {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, new Set());
            }
            this.grid.get(cellKey)!.add(element.id);
        });
    }

    /**
     * Remove an element from the spatial index
     */
    public remove(elementId: string): void {
        const element = this.elements.get(elementId);
        if (!element) return;

        const bounds = this.elementBounds.get(elementId);
        if (bounds) {
            const cells = this.getCellsForElement(element);
            cells.forEach(cellKey => {
                const cell = this.grid.get(cellKey);
                if (cell) {
                    cell.delete(elementId);
                    if (cell.size === 0) {
                        this.grid.delete(cellKey);
                    }
                }
            });
        }

        this.elements.delete(elementId);
        this.elementBounds.delete(elementId);
    }

    /**
     * Find elements in a given rectangular area
     */
    public queryRect(x: number, y: number, width: number, height: number): DrawingElement[] {
        const minX = Math.min(x, x + width);
        const minY = Math.min(y, y + height);
        const maxX = Math.max(x, x + width);
        const maxY = Math.max(y, y + height);

        // Get all cells that intersect the query rectangle
        const startCellX = Math.floor(minX / this.cellSize);
        const startCellY = Math.floor(minY / this.cellSize);
        const endCellX = Math.floor(maxX / this.cellSize);
        const endCellY = Math.floor(maxY / this.cellSize);

        const candidateIds = new Set<string>();

        // Collect all element IDs from intersecting cells
        for (let cx = startCellX; cx <= endCellX; cx++) {
            for (let cy = startCellY; cy <= endCellY; cy++) {
                const cellKey = `${cx}:${cy}`;
                const cell = this.grid.get(cellKey);
                if (cell) {
                    cell.forEach(id => candidateIds.add(id));
                }
            }
        }

        // Filter elements that actually intersect the rectangle
        const results: DrawingElement[] = [];
        candidateIds.forEach(id => {
            const element = this.elements.get(id);
            const bounds = this.elementBounds.get(id);
            if (element && bounds) {
                if (bounds.minX <= maxX && bounds.maxX >= minX &&
                    bounds.minY <= maxY && bounds.maxY >= minY) {
                    results.push(element);
                }
            }
        });

        return results;
    }

    /**
     * Find elements near a point (for hit testing)
     */
    public queryPoint(point: Point, tolerance: number = 5): DrawingElement[] {
        return this.queryRect(
            point.x - tolerance,
            point.y - tolerance,
            tolerance * 2,
            tolerance * 2
        );
    }

    /**
     * Clear the spatial index
     */
    public clear(): void {
        this.grid.clear();
        this.elementBounds.clear();
        this.elements.clear();
    }

    /**
     * Get stats about the spatial index
     */
    public getStats(): { cells: number; elements: number; avgElementsPerCell: number } {
        let totalElements = 0;
        this.grid.forEach(cell => {
            totalElements += cell.size;
        });

        return {
            cells: this.grid.size,
            elements: this.elements.size,
            avgElementsPerCell: this.grid.size > 0 ? totalElements / this.grid.size : 0
        };
    }
}