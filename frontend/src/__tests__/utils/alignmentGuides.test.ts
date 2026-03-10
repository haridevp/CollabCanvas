import { describe, it, expect } from 'vitest';
import { findAlignmentGuides, getElementBounds } from '../../utils/alignmentGuides';
import type { DrawingElement } from '../../types/canvas';

describe('alignmentGuides', () => {
  describe('getElementBounds', () => {
    it('returns bounds for a rectangle element', () => {
      const element: DrawingElement = {
        id: 'rect1', type: 'rectangle', x: 10, y: 20, width: 100, height: 50,
        color: '#000', strokeWidth: 2,
      };
      const bounds = getElementBounds(element);
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBe(10);
      expect(bounds!.y).toBe(20);
      expect(bounds!.width).toBe(100);
      expect(bounds!.height).toBe(50);
      expect(bounds!.centerX).toBe(60);
      expect(bounds!.centerY).toBe(45);
      expect(bounds!.right).toBe(110);
      expect(bounds!.bottom).toBe(70);
    });

    it('handles negative width/height', () => {
      const element: DrawingElement = {
        id: 'rect2', type: 'rectangle', x: 100, y: 100, width: -50, height: -30,
        color: '#000', strokeWidth: 2,
      };
      const bounds = getElementBounds(element);
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBe(50);
      expect(bounds!.y).toBe(70);
      expect(bounds!.width).toBe(50);
      expect(bounds!.height).toBe(30);
    });

    it('returns bounds from points for pencil elements', () => {
      const element: DrawingElement = {
        id: 'pencil1', type: 'pencil',
        points: [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 80 }],
        color: '#000', strokeWidth: 2,
      };
      const bounds = getElementBounds(element);
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBe(0);
      expect(bounds!.y).toBe(0);
      expect(bounds!.right).toBe(100);
      expect(bounds!.bottom).toBe(80);
    });

    it('returns null for elements with no position data', () => {
      const element: DrawingElement = {
        id: 'empty', type: 'pencil', color: '#000', strokeWidth: 2,
      };
      const bounds = getElementBounds(element);
      expect(bounds).toBeNull();
    });
  });

  describe('findAlignmentGuides', () => {
    const movingElement: DrawingElement = {
      id: 'moving', type: 'rectangle', x: 100, y: 100, width: 50, height: 50,
      color: '#000', strokeWidth: 2,
    };

    it('returns empty guides when no other elements exist', () => {
      const result = findAlignmentGuides(movingElement, { x: 100, y: 100 }, []);
      expect(result.guides).toHaveLength(0);
      expect(result.didSnap).toBe(false);
    });

    it('snaps to aligned left edges', () => {
      const otherElement: DrawingElement = {
        id: 'other', type: 'rectangle', x: 200, y: 50, width: 60, height: 60,
        color: '#000', strokeWidth: 2,
      };
      // Position moving element's left edge near other's left edge
      const result = findAlignmentGuides(movingElement, { x: 202, y: 100 }, [otherElement], 5);
      expect(result.didSnap).toBe(true);
      expect(result.snappedPosition.x).toBe(200);
      expect(result.guides.some(g => g.axis === 'vertical')).toBe(true);
    });

    it('snaps to aligned center vertically', () => {
      const otherElement: DrawingElement = {
        id: 'other', type: 'rectangle', x: 200, y: 50, width: 50, height: 50,
        color: '#000', strokeWidth: 2,
      };
      // Moving element center should align with other center
      const result = findAlignmentGuides(movingElement, { x: 201, y: 100 }, [otherElement], 5);
      expect(result.didSnap).toBe(true);
    });

    it('does not snap when beyond threshold', () => {
      const otherElement: DrawingElement = {
        id: 'other', type: 'rectangle', x: 300, y: 300, width: 50, height: 50,
        color: '#000', strokeWidth: 2,
      };
      const result = findAlignmentGuides(movingElement, { x: 100, y: 100 }, [otherElement], 5);
      expect(result.didSnap).toBe(false);
    });

    it('skips the moving element itself', () => {
      const result = findAlignmentGuides(movingElement, { x: 100, y: 100 }, [movingElement], 5);
      expect(result.guides).toHaveLength(0);
    });
  });
});
