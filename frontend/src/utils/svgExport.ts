import type { DrawingElement, Point, TextElement, ImageElement } from '../types/canvas';

/**
 * Converts a set of drawing elements to an SVG string.
 * @param elements - The elements to render
 * @param width - The width of the viewport/canvas
 * @param height - The height of the viewport/canvas
 * @param includeGrid - Whether to render background grid
 * @param viewBox - Optional viewBox [x, y, width, height] for exporting specific areas
 */
export const elementsToSVG = (
  elements: DrawingElement[],
  width: number,
  height: number,
  includeGrid: boolean = false,
  viewBox?: [number, number, number, number]
): string => {
  const vb = viewBox ? viewBox.join(' ') : `0 0 ${width} ${height}`;
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${vb}">`;

  // 1. Add background
  svgContent += `<rect x="${viewBox ? viewBox[0] : 0}" y="${viewBox ? viewBox[1] : 0}" width="${viewBox ? viewBox[2] : width}" height="${viewBox ? viewBox[3] : height}" fill="#ffffff" />`;

  // 2. Add grid if requested
  if (includeGrid) {
    svgContent += `
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(229, 231, 235, 0.5)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect x="${viewBox ? viewBox[0] : 0}" y="${viewBox ? viewBox[1] : 0}" width="${viewBox ? viewBox[2] : width}" height="${viewBox ? viewBox[3] : height}" fill="url(#grid)" />
    `;
  }

  // 3. Render elements
  elements.forEach((el) => {
    const opacity = el.opacity ?? 1;
    const strokeWidth = el.strokeWidth ?? 3;
    const color = el.color ?? '#000000';

    // Stroke dash logic
    let strokeDasharray = '';
    if (el.strokeStyle?.dashArray && el.strokeStyle.dashArray.length > 0) {
      strokeDasharray = `stroke-dasharray="${el.strokeStyle.dashArray.join(',')}"`;
    } else if (el.strokeStyle?.type === 'dashed') {
      strokeDasharray = 'stroke-dasharray="5,5"';
    } else if (el.strokeStyle?.type === 'dotted') {
      strokeDasharray = 'stroke-dasharray="1,3"';
    }

    const strokeProps = `stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" stroke-linecap="${el.strokeStyle?.lineCap || 'round'}" stroke-linejoin="${el.strokeStyle?.lineJoin || 'round'}" fill="none" ${strokeDasharray}`;

    switch (el.type) {
      case 'pencil':
      case 'eraser':
        if (el.points && el.points.length > 0) {
          const d = `M ${el.points.map((p: Point) => `${p.x} ${p.y}`).join(' L ')}`;
          const extraProps = el.type === 'eraser' ? 'stroke="#ffffff"' : strokeProps;
          svgContent += `<path d="${d}" ${extraProps} />`;
        }
        break;

      case 'rectangle':
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          const x = el.width < 0 ? el.x + el.width : el.x;
          const y = el.height < 0 ? el.y + el.height : el.y;
          const w = Math.abs(el.width);
          const h = Math.abs(el.height);
          svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${strokeProps} />`;
        }
        break;

      case 'circle':
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          const radius = Math.sqrt(el.width ** 2 + el.height ** 2);
          svgContent += `<circle cx="${el.x}" cy="${el.y}" r="${Math.abs(radius)}" ${strokeProps} />`;
        }
        break;

      case 'line':
      case 'arrow':
        if (el.points && el.points.length === 2) {
          const [start, end] = el.points;
          svgContent += `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" ${strokeProps} />`;

          if (el.type === 'arrow') {
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const headlen = strokeWidth * 3;
            const x1 = end.x - headlen * Math.cos(angle - Math.PI / 6);
            const y1 = end.y - headlen * Math.sin(angle - Math.PI / 6);
            const x2 = end.x - headlen * Math.cos(angle + Math.PI / 6);
            const y2 = end.y - headlen * Math.sin(angle + Math.PI / 6);
            svgContent += `<path d="M ${end.x} ${end.y} L ${x1} ${y1} M ${end.x} ${end.y} L ${x2} ${y2}" ${strokeProps} />`;
          }
        }
        break;

      case 'text': {
        const textEl = el as TextElement;
        if (textEl.x !== undefined && textEl.y !== undefined && textEl.text) {
          const fontSize = textEl.format?.fontSize || 16;
          const fontFamily = textEl.format?.fontFamily || 'Arial';
          const fontWeight = textEl.format?.fontWeight || 'normal';
          const fontStyle = textEl.format?.fontStyle || 'normal';
          const textAlign = textEl.format?.textAlign || 'left';

          const textAnchor = textAlign === 'center' ? 'middle' : textAlign === 'right' ? 'end' : 'start';
          
          const lines = textEl.text.split('\n');
          lines.forEach((line, index) => {
             svgContent += `
              <text 
                x="${textEl.x}" 
                y="${textEl.y + (index * fontSize * 1.2) + fontSize}" 
                font-family="${fontFamily}" 
                font-size="${fontSize}px" 
                font-weight="${fontWeight}" 
                font-style="${fontStyle}" 
                fill="${textEl.format?.color || color}" 
                opacity="${opacity}"
                text-anchor="${textAnchor}"
              >${line}</text>
            `;
          });
        }
        break;
      }

      case 'image': {
        const imageEl = el as ImageElement;
        if (imageEl.x !== undefined && imageEl.y !== undefined && imageEl.src) {
          const x = imageEl.width < 0 ? imageEl.x + imageEl.width : imageEl.x;
          const y = imageEl.height < 0 ? imageEl.y + imageEl.height : imageEl.y;
          const w = Math.abs(imageEl.width);
          const h = Math.abs(imageEl.height);
          svgContent += `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${imageEl.src}" opacity="${opacity}" />`;
        }
        break;
      }
    }
  });

  svgContent += '</svg>';
  return svgContent;
};
