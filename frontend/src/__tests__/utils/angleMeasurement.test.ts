import { describe, it, expect } from 'vitest';
import {
  calculateAngle,
  calculateInteriorAngle,
  formatAngle,
  getAngleArcPath,
  getAngleLabelPosition,
  getLineAngle,
} from '../../utils/angleMeasurement';

describe('angleMeasurement', () => {
  describe('calculateAngle', () => {
    it('returns 90 degrees for a right angle', () => {
      const angle = calculateAngle(
        { x: 100, y: 0 },  // point A (right)
        { x: 0, y: 0 },     // vertex
        { x: 0, y: 100 },   // point B (down)
      );
      expect(angle).toBeCloseTo(90, 0);
    });

    it('returns 180 degrees for a straight line angle', () => {
      const angle = calculateAngle(
        { x: 100, y: 0 },
        { x: 0, y: 0 },
        { x: -100, y: 0 },
      );
      expect(angle).toBeCloseTo(180, 0);
    });

    it('returns 0 for same direction', () => {
      const angle = calculateAngle(
        { x: 100, y: 0 },
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      );
      expect(angle).toBeCloseTo(0, 0);
    });

    it('returns 270 for three-quarter turn', () => {
      const angle = calculateAngle(
        { x: 100, y: 0 },   // point A (Right)
        { x: 0, y: 0 },     // vertex
        { x: 0, y: -100 },  // point B (Up)
      );
      expect(angle).toBeCloseTo(270, 0);
    });
  });

  describe('calculateInteriorAngle', () => {
    it('returns the smaller angle (≤ 180)', () => {
      const angle = calculateInteriorAngle(
        { x: 0, y: -100 },
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      );
      expect(angle).toBeCloseTo(90, 0);
    });

    it('returns 180 for opposite directions', () => {
      const angle = calculateInteriorAngle(
        { x: -100, y: 0 },
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      );
      expect(angle).toBeCloseTo(180, 0);
    });
  });

  describe('formatAngle', () => {
    it('formats with default precision', () => {
      expect(formatAngle(45)).toBe('45.0°');
    });

    it('formats with custom precision', () => {
      expect(formatAngle(90.123, 2)).toBe('90.12°');
    });

    it('formats zero', () => {
      expect(formatAngle(0)).toBe('0.0°');
    });
  });

  describe('getAngleArcPath', () => {
    it('returns a valid SVG path string', () => {
      const path = getAngleArcPath({ x: 0, y: 0 }, 20, 0, Math.PI / 2);
      expect(path).toContain('M');
      expect(path).toContain('A');
    });

    it('uses correct start point', () => {
      const path = getAngleArcPath({ x: 0, y: 0 }, 20, 0, Math.PI / 2);
      // Start point at angle 0: (20, 0)
      expect(path).toMatch(/M 20/);
    });
  });

  describe('getAngleLabelPosition', () => {
    it('returns midpoint of the arc', () => {
      const pos = getAngleLabelPosition({ x: 0, y: 0 }, 30, 0, Math.PI / 2);
      // Midpoint of 0 to PI/2 is PI/4
      const expectedX = 30 * Math.cos(Math.PI / 4);
      const expectedY = 30 * Math.sin(Math.PI / 4);
      expect(pos.x).toBeCloseTo(expectedX, 1);
      expect(pos.y).toBeCloseTo(expectedY, 1);
    });
  });

  describe('getLineAngle', () => {
    it('returns 0 for horizontal right', () => {
      expect(getLineAngle({ x: 0, y: 0 }, { x: 100, y: 0 })).toBeCloseTo(0, 0);
    });

    it('returns 90 for straight down', () => {
      expect(getLineAngle({ x: 0, y: 0 }, { x: 0, y: 100 })).toBeCloseTo(90, 0);
    });

    it('returns 180 for horizontal left', () => {
      expect(getLineAngle({ x: 0, y: 0 }, { x: -100, y: 0 })).toBeCloseTo(180, 0);
    });
  });
});
