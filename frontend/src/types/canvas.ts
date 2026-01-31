/**
 * Type definition for a 2D coordinate point
 * Used to represent positions on the canvas
 */
export type Point = { 
  x: number; 
  y: number; 
};

/**
 * Interface defining a drawing element on the canvas
 * Supports multiple drawing types: freehand, shapes, and text
 */
export interface DrawingElement {
  /** Unique identifier for the drawing element */
  id: string;
  
  /** Type of drawing element */
  type: 'pencil' | 'rectangle' | 'circle' | 'text';
  
  /** 
   * Array of points for freehand pencil drawings
   * Each point represents a segment of the drawn line
   * Only applicable when type is 'pencil'
   */
  points?: Point[];
  
  /** 
   * X-coordinate position for shape-based elements
   * Applicable for rectangle, circle, and text types
   */
  x?: number;
  
  /** 
   * Y-coordinate position for shape-based elements
   * Applicable for rectangle, circle, and text types
   */
  y?: number;
  
  /** 
   * Width dimension for rectangle elements
   * Only applicable when type is 'rectangle'
   */
  width?: number;
  
  /** 
   * Height dimension for rectangle elements
   * Only applicable when type is 'rectangle' or 'circle'
   * For circles, this is used to calculate radius
   */
  height?: number;
  
  /** 
   * Color of the drawing element in hex format
   * Example: '#2563eb' for blue
   */
  color: string;
  
  /** 
   * Stroke width/thickness of the drawing element in pixels
   * Controls the visual weight of lines and borders
   */
  strokeWidth: number;
}