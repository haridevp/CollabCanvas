import { elementsToSVG } from '../../utils/svgExport';
import type { DrawingElement } from '../../types/canvas';

describe('svgExport', () => {
  const mockElements: DrawingElement[] = [
    {
      id: '1',
      type: 'pencil',
      color: '#ff0000',
      strokeWidth: 2,
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
    },
    {
      id: '2',
      type: 'rectangle',
      color: '#00ff00',
      strokeWidth: 1,
      x: 30,
      y: 30,
      width: 50,
      height: 40,
    }
  ];

  it('should generate valid SVG string', () => {
    const svg = elementsToSVG(mockElements, 100, 100);
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 100 100"');
    expect(svg).toContain('stroke="#ff0000"');
    expect(svg).toContain('stroke="#00ff00"');
    expect(svg).toContain('<path d="M 10 10 L 20 20"');
    expect(svg).toContain('<rect x="30" y="30" width="50" height="40"');
  });

  it('should include grid when requested', () => {
    const svg = elementsToSVG([], 100, 100, true);
    expect(svg).toContain('<pattern id="grid"');
    expect(svg).toContain('fill="url(#grid)"');
  });

  it('should apply viewBox when selectionOnly is true', () => {
    const svg = elementsToSVG(mockElements, 50, 40, false, [30, 30, 50, 40]);
    expect(svg).toContain('viewBox="30 30 50 40"');
  });

  it('should handle eraser elements', () => {
    const eraserElement: DrawingElement = {
      id: '3',
      type: 'eraser',
      color: '#000000',
      strokeWidth: 5,
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
    };
    const svg = elementsToSVG([eraserElement], 100, 100);
    expect(svg).toContain('stroke="#ffffff"');
  });
});
