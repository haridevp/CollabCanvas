import React, { useRef, useEffect, useState } from 'react';
import type { DrawingElement, Point } from '../../types/canvas';
import { Square, Circle, Edit2, Trash2 } from 'lucide-react';

/**
 * CollaborativeCanvas component - Interactive drawing canvas with multiple tools
 * Supports pencil drawing, rectangles, circles, and color selection
 */
export const CollaborativeCanvas = () => {
  // Canvas reference for drawing operations
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Drawing state management
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [tool, setTool] = useState<'pencil' | 'rectangle' | 'circle'>('pencil');
  const [color, setColor] = useState('#2563eb');

  /**
   * Handles the start of a drawing operation
   * Creates a new drawing element based on the selected tool
   */
  const startDrawing = (e: React.MouseEvent) => {
    const { offsetX, offsetY } = e.nativeEvent;
    setIsDrawing(true);
    
    const id = Date.now().toString();
    const newElement: DrawingElement = {
      id,
      type: tool,
      x: offsetX,
      y: offsetY,
      width: 0,
      height: 0,
      points: tool === 'pencil' ? [{ x: offsetX, y: offsetY }] : [],
      color: color,
      strokeWidth: 3,
    };
    
    setElements((prev) => [...prev, newElement]);
  };

  /**
   * Handles drawing updates while mouse is moving
   * Updates the current drawing element based on tool type
   */
  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = e.nativeEvent;

    setElements((prev) => {
      const lastIdx = prev.length - 1;
      const lastElement = { ...prev[lastIdx] };

      if (tool === 'pencil' && lastElement.points) {
        lastElement.points = [...lastElement.points, { x: offsetX, y: offsetY }];
      } else {
        lastElement.width = offsetX - (lastElement.x || 0);
        lastElement.height = offsetY - (lastElement.y || 0);
      }

      return [...prev.slice(0, lastIdx), lastElement];
    });
  };

  /**
   * Stops the drawing operation
   */
  const stopDrawing = () => setIsDrawing(false);

  /**
   * Effect to redraw all elements on canvas when elements change
   * Handles rendering of different element types (pencil, rectangle, circle)
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas for redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Render each drawing element
    elements.forEach((el) => {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;

      if (el.type === 'pencil' && el.points) {
        // Draw freehand pencil strokes
        el.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
      } else if (el.type === 'rectangle') {
        // Draw rectangle
        ctx.strokeRect(el.x!, el.y!, el.width!, el.height!);
      } else if (el.type === 'circle') {
        // Draw circle with calculated radius
        const radius = Math.sqrt(Math.pow(el.width!, 2) + Math.pow(el.height!, 2));
        ctx.arc(el.x!, el.y!, radius, 0, 2 * Math.PI);
      }
      ctx.stroke();
    });
  }, [elements]);

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden">
      {/* Enhanced toolbar with drawing tools and controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-4 z-10">
        {/* Drawing tool selection */}
        <div className="flex border-r border-slate-200 pr-4 gap-2">
          <button 
            onClick={() => setTool('pencil')} 
            className={`p-2 rounded ${tool === 'pencil' ? 'bg-blue-100 text-blue-600' : 'text-slate-600'}`}
            aria-label="Select pencil tool"
          >
            <Edit2 size={20} />
          </button>
          <button 
            onClick={() => setTool('rectangle')} 
            className={`p-2 rounded ${tool === 'rectangle' ? 'bg-blue-100 text-blue-600' : 'text-slate-600'}`}
            aria-label="Select rectangle tool"
          >
            <Square size={20} />
          </button>
          <button 
            onClick={() => setTool('circle')} 
            className={`p-2 rounded ${tool === 'circle' ? 'bg-blue-100 text-blue-600' : 'text-slate-600'}`}
            aria-label="Select circle tool"
          >
            <Circle size={20} />
          </button>
        </div>
        
        {/* Color picker */}
        <input 
          type="color" 
          value={color} 
          onChange={(e) => setColor(e.target.value)} 
          className="w-8 h-8 rounded cursor-pointer border-none" 
          aria-label="Select drawing color"
        />
        
        {/* Clear canvas button */}
        <button 
          onClick={() => setElements([])} 
          className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
          aria-label="Clear all drawings"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Main drawing canvas */}
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="bg-white cursor-crosshair"
        aria-label="Collaborative drawing canvas"
      />
    </div>
  );
};