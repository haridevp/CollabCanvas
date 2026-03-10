import { describe, it, expect } from 'vitest';
import {
  createDimensionLine,
  formatDimension,
  getDimensionLineGeometry,
  calculateArea,
} from '../../utils/dimensionLines';

describe('dimensionLines', () => {
  describe('createDimensionLine', () => {
    it('creates a horizontal dimension line', () => {
      const dim = createDimensionLine(
        { x: 50, y: 100 },
        { x: 250, y: 100 },
        30,
      );
      expect(dim.pixelLength).toBeCloseTo(200, 0);
      expect(dim.labelText).toBe('200 px');
      expect(dim.angle).toBeCloseTo(0, 5);
      expect(dim.labelPosition.x).toBeCloseTo(150, 0);
    });

    it('creates a vertical dimension line', () => {
      const dim = createDimensionLine(
        { x: 100, y: 50 },
        { x: 100, y: 250 },
        30,
      );
      expect(dim.pixelLength).toBeCloseTo(200, 0);
      expect(dim.angle).toBeCloseTo(Math.PI / 2, 5);
    });

    it('creates a diagonal dimension line', () => {
      const dim = createDimensionLine(
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        30,
      );
      expect(dim.pixelLength).toBeCloseTo(Math.sqrt(20000), 0);
      expect(dim.angle).toBeCloseTo(Math.PI / 4, 5);
    });

    it('uses scale when provided', () => {
      const dim = createDimensionLine(
        { x: 0, y: 0 },
        { x: 96, y: 0 },
        30,
        { pixelsPerUnit: 96, unit: 'in' },
      );
      expect(dim.labelText).toBe('1.0 in');
    });

    it('extension lines start from measurement points', () => {
      const dim = createDimensionLine(
        { x: 10, y: 20 },
        { x: 110, y: 20 },
        30,
      );
      expect(dim.extensionLineStart1.x).toBe(10);
      expect(dim.extensionLineStart1.y).toBe(20);
      expect(dim.extensionLineStart2.x).toBe(110);
      expect(dim.extensionLineStart2.y).toBe(20);
    });
  });

  describe('formatDimension', () => {
    it('formats pixels with no scale', () => {
      expect(formatDimension(150)).toBe('150 px');
    });

    it('formats with mm scale', () => {
      expect(formatDimension(100, { pixelsPerUnit: 3.78, unit: 'mm' })).toBe('26.5 mm');
    });

    it('formats with custom precision', () => {
      expect(formatDimension(100, { pixelsPerUnit: 96, unit: 'in' }, 3)).toBe('1.042 in');
    });

    it('handles zero length', () => {
      expect(formatDimension(0)).toBe('0 px');
    });
  });

  describe('getDimensionLineGeometry', () => {
    it('returns extension lines, dimension line, arrowheads, and label', () => {
      const geo = getDimensionLineGeometry(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        30,
      );
      expect(geo.extensionLines).toHaveLength(2);
      expect(geo.dimensionLine).toHaveLength(2);
      expect(geo.arrowheads).toHaveLength(2);
      expect(geo.label.text).toBe('100 px');
      expect(geo.label.position.x).toBeCloseTo(50, 0);
    });

    it('arrowheads point in opposite directions', () => {
      const geo = getDimensionLineGeometry(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        30,
      );
      const angleDiff = Math.abs(geo.arrowheads[1].angle - geo.arrowheads[0].angle);
      expect(angleDiff).toBeCloseTo(Math.PI, 5);
    });
  });

  describe('calculateArea', () => {
    it('calculates pixel area', () => {
      expect(calculateArea(100, 50)).toBe('5000 px²');
    });

    it('calculates area with scale', () => {
      const result = calculateArea(96, 96, { pixelsPerUnit: 96, unit: 'in' });
      expect(result).toBe('1.00 in²');
    });
  });
});
