import { describe, it, expect } from 'vitest';
import { isPointInElement, distanceToLineSegment } from '../../utils/geometry';
import type { DrawingElement, Point } from '../../types/canvas';

describe('geometry', () => {
  describe('distanceToLineSegment', () => {
    it('returns 0 for point on the segment', () => {
      const d = distanceToLineSegment({ x: 50, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 });
      expect(d).toBeCloseTo(0, 5);
    });

    it('returns perpendicular distance', () => {
      const d = distanceToLineSegment({ x: 50, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 });
      expect(d).toBeCloseTo(10, 5);
    });

    it('returns distance to nearest endpoint if perpendicular falls outside', () => {
      const d = distanceToLineSegment({ x: -10, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 });
      expect(d).toBeCloseTo(10, 5);
    });
  });

  describe('isPointInElement - rectangle', () => {
    const rect: DrawingElement = {
      id: 'r1', type: 'rectangle', x: 10, y: 10, width: 100, height: 50,
      color: '#000', strokeWidth: 2,
    };

    it('returns true for point inside', () => {
      expect(isPointInElement({ x: 50, y: 30 }, rect)).toBe(true);
    });

    it('returns false for point outside', () => {
      expect(isPointInElement({ x: 200, y: 200 }, rect)).toBe(false);
    });
  });

  describe('isPointInElement - triangle', () => {
    const triangle: DrawingElement = {
      id: 't1', type: 'triangle', x: 0, y: 0, width: 100, height: 100,
      color: '#000', strokeWidth: 2,
    };

    it('returns true for point inside triangle', () => {
      // Center of the triangle should be inside
      expect(isPointInElement({ x: 50, y: 70 }, triangle)).toBe(true);
    });

    it('returns true for point near triangle edge', () => {
      // Bottom edge midpoint
      expect(isPointInElement({ x: 50, y: 100 }, triangle)).toBe(true);
    });

    it('returns false for point outside triangle', () => {
      // Top-left corner is outside the triangle
      expect(isPointInElement({ x: 5, y: 5 }, triangle)).toBe(false);
    });

    it('handles negative width/height', () => {
      const negTriangle: DrawingElement = {
        id: 't2', type: 'triangle', x: 100, y: 100, width: -100, height: -100,
        color: '#000', strokeWidth: 2,
      };
      // Should be equivalent to triangle at (0,0) with w=100, h=100
      expect(isPointInElement({ x: 50, y: 70 }, negTriangle)).toBe(true);
    });
  });

  describe('isPointInElement - circle', () => {
    const circle: DrawingElement = {
      id: 'c1', type: 'circle', x: 50, y: 50, width: 100, height: 100,
      color: '#000', strokeWidth: 2,
    };

    it('returns true for point inside circle', () => {
      expect(isPointInElement({ x: 100, y: 100 }, circle)).toBe(true);
    });

    it('returns false for point outside circle', () => {
      expect(isPointInElement({ x: 200, y: 200 }, circle)).toBe(false);
    });
  });

  describe('isPointInElement - line', () => {
    const line: DrawingElement = {
      id: 'l1', type: 'line',
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      color: '#000', strokeWidth: 2,
    };

    it('returns true for point near the line', () => {
      expect(isPointInElement({ x: 50, y: 3 }, line)).toBe(true);
    });

    it('returns false for point far from the line', () => {
      expect(isPointInElement({ x: 50, y: 50 }, line)).toBe(false);
    });
  });

  describe('isPointInElement - pencil', () => {
    const pencil: DrawingElement = {
      id: 'p1', type: 'pencil',
      points: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }],
      color: '#000', strokeWidth: 2,
    };

    it('returns true for point near a stroke point', () => {
      expect(isPointInElement({ x: 51, y: 51 }, pencil)).toBe(true);
    });

    it('returns false for distant point', () => {
      expect(isPointInElement({ x: 200, y: 200 }, pencil)).toBe(false);
    });
  });
});
