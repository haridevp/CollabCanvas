/**
 * Drawing Types Definitions
 * 
 * Type definitions and interfaces for drawing and canvas functionality
 * These types are used throughout the drawing application for consistent
 * type safety and documentation.
 * 
 * @module DrawingTypes
 */

/**
 * Type definition for a 2D coordinate point
 * Represents positions on the canvas with x and y coordinates
 * 
 * @typedef {Object} Point
 * @property {number} x - The horizontal coordinate (pixels from left)
 * @property {number} y - The vertical coordinate (pixels from top)
 * 
 * @example
 * ```typescript
 * const startPoint: Point = { x: 100, y: 150 };
 * const endPoint: Point = { x: 300, y: 250 };
 * ```
 */
export type Point = {
  /** Horizontal coordinate in pixels from the left edge */
  x: number;
  /** Vertical coordinate in pixels from the top edge */
  y: number;
};

/**
 * Type definition for brush types
 * Represents different brush styles available in the drawing tools
 * 
 * @typedef {'pencil' | 'brush' | 'marker' | 'airbrush' | 'highlighter' | 'solid' | 'textured'} BrushType
 */
export type BrushType = 'pencil' | 'brush' | 'marker' | 'airbrush' | 'highlighter' | 'solid' | 'textured';

/**
 * Interface defining brush properties for drawing
 * Controls the visual characteristics of brush strokes
 * 
 * @interface BrushProperties
 */
export interface BrushProperties {
  /** Brush color in hexadecimal format (e.g., '#2563eb') */
  color: string;
  /** Brush stroke width in pixels */
  width: number;
  /** Brush opacity value ranging from 0 (transparent) to 1 (opaque) */
  opacity: number;
  /** 
   * Brush type affecting rendering behavior
   * - 'solid': Standard solid brush
   * - 'textured': Brush with texture pattern
   * - 'airbrush': Soft, spray-like brush
   * - 'pencil': Pencil-like texture
   * - 'brush': Paintbrush texture
   * - 'marker': Marker pen style
   * - 'highlighter': Semi-transparent highlighter
   */
  type: BrushType;
  /** Optional URL or data URI for custom brush texture */
  texture?: string;
  /** Spacing between brush stamps (for textured brushes) */
  spacing?: number;
  /** Random scatter amount for brush stamps (0 = none, 1 = maximum scatter) */
  scatter?: number;
}

/**
 * Interface for brush configuration settings
 * Controls how brushes behave and respond to input
 * 
 * @interface BrushConfig
 */
export interface BrushConfig {
  /** Minimum allowed brush width in pixels */
  minWidth: number;
  /** Maximum allowed brush width in pixels */
  maxWidth: number;
  /** Whether brush width responds to pressure (for tablets/stylus) */
  pressureSensitive: boolean;
  /** Smoothing factor for brush strokes (0 = no smoothing, 1 = maximum smoothing) */
  smoothing: number;
  /** Whether anti-aliasing is enabled for smoother edges */
  antiAliasing: boolean;
}

/**
 * Interface for stroke style properties
 * Controls the appearance of lines and borders
 * 
 * @interface StrokeStyle
 */
export interface StrokeStyle {
  /** 
   * Type of stroke pattern
   * - 'solid': Continuous line
   * - 'dashed': Dashed line pattern
   * - 'dotted': Dotted line pattern
   */
  type: 'solid' | 'dashed' | 'dotted';

  /** 
   * Custom dash array pattern for dashed lines
   * Example: [5, 3] creates 5px dash followed by 3px gap
   * Only applicable when type is 'dashed'
   */
  dashArray?: number[];

  /** 
   * Style of line endings
   * - 'butt': Square ends that don't extend past endpoints
   * - 'round': Rounded ends
   * - 'square': Square ends that extend half line width beyond endpoints
   */
  lineCap?: 'butt' | 'round' | 'square';

  /** 
   * Style of line joins at corners
   * - 'bevel': Beveled (flattened) corners
   * - 'round': Rounded corners
   * - 'miter': Sharp corners
   */
  lineJoin?: 'bevel' | 'round' | 'miter';
}

/**
 * Interface for drawing elements on the canvas
 * 
 * This is the main interface representing any drawable element on the canvas.
 * Different types of drawing elements have different required properties.
 * 
 * @interface DrawingElement
 */
export interface DrawingElement {
  /** 
   * Unique identifier for the drawing element
   * Used for selection, editing, and deletion operations
   */
  id: string;

  /** 
   * Type of drawing element
   * Determines how the element is rendered and what properties are required
   * 
   * @type {'pencil' | 'rectangle' | 'circle' | 'text' | 'line' | 'arrow' | 'eraser'}
   */
  type: 'pencil' | 'rectangle' | 'circle' | 'text' | 'line' | 'arrow' | 'eraser' | 'image';

  /** 
   * Array of points for freehand pencil drawings
   * Each point represents a segment of the drawn line
   * Only applicable when type is 'pencil', 'line', or 'eraser'
   */
  points?: Point[];

  /** 
   * X-coordinate position for shape-based elements
   * Applicable for rectangle, circle, and text types
   * Represents the top-left corner of bounding box
   */
  x?: number;

  /** 
   * Y-coordinate position for shape-based elements
   * Applicable for rectangle, circle, and text types
   * Represents the top-left corner of bounding box
   */
  y?: number;

  /** 
   * Width dimension for rectangle elements
   * Only applicable when type is 'rectangle'
   */
  width?: number;

  /** 
   * Height dimension for shape elements
   * For rectangles: height of the rectangle
   * For circles: used to calculate radius (height = width for perfect circles)
   */
  height?: number;

  /** 
   * Color of the drawing element in hexadecimal format
   * Example: '#2563eb' for blue
   * For pencil/brush strokes, this is the stroke color
   * For shapes, this is the fill or border color depending on context
   */
  color: string;

  /** 
   * Stroke width/thickness of the drawing element in pixels
   * Controls the visual weight of lines and borders
   * For text elements, this might control outline/stroke around text
   */
  strokeWidth: number;

  /** 
   * Opacity of the drawing element
   * Range: 0 (completely transparent) to 1 (completely opaque)
   */
  opacity?: number;

  /** 
   * Brush properties for freehand drawing
   * Only applicable for pencil type drawings
   * Provides detailed control over brush characteristics
   */
  brushProperties?: BrushProperties;

  /** 
   * Stroke style properties for lines and borders
   * Controls dash patterns, line caps, and joins
   */
  strokeStyle?: StrokeStyle;

  /** ID of the layer this element belongs to */
  layerId?: string;
}

/**
 * Interface for text formatting options
 * 
 * @interface TextFormat
 */
export interface TextFormat {
  /** Font family (e.g., 'Arial', 'Helvetica', 'Times New Roman') */
  fontFamily: string;
  /** Font size in pixels */
  fontSize: number;
  /** Font weight - normal, bold, or numeric value */
  fontWeight: 'normal' | 'bold' | number;
  /** Font style - normal or italic */
  fontStyle: 'normal' | 'italic';
  /** Text decoration - none, underline, line-through */
  textDecoration: 'none' | 'underline' | 'line-through';
  /** Text alignment - left, center, right */
  textAlign: 'left' | 'center' | 'right';
  /** Text color */
  color: string;
  /** Background color (optional) */
  backgroundColor?: string;
}

/**
 * Interface for text drawing elements
 * 
 * @interface TextElement
 * @extends DrawingElement
 */
export interface TextElement extends DrawingElement {
  type: 'text';
  /** The text content */
  text: string;
  /** Text formatting options */
  format: TextFormat;
  /** Width of text bounding box (calculated, not set by user) */
  width?: number;
  /** Height of text bounding box (calculated, not set by user) */
  height?: number;
}

/**
 * Interface for image drawing elements
 * 
 * @interface ImageElement
 * @extends DrawingElement
 */
export interface ImageElement extends DrawingElement {
  type: 'image';
  /** Source of the image (data URL, blob URL, or external URL) */
  src: string;
  /** Width of the image in pixels */
  width: number;
  /** Height of the image in pixels */
  height: number;
  /** Original width of the image (before scaling) */
  originalWidth: number;
  /** Original height of the image (before scaling) */
  originalHeight: number;
  /** Rotation angle in degrees */
  rotation?: number;
  /** Whether the image is currently being loaded */
  isLoading?: boolean;
}

/**
 * Interface for transform handles
 * 
 * @interface TransformHandles
 */
export interface TransformHandles {
  /** Whether the object is currently being transformed */
  isTransforming: boolean;
  /** Type of transform being applied */
  transformType: 'move' | 'resize' | 'rotate' | 'none';
  /** Active handle for resize operations */
  activeHandle?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'right' | 'bottom' | 'left' | 'rotate';
  /** Initial mouse position when transform started */
  initialMousePos?: Point;
  /** Initial object properties when transform started */
  initialProps?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
}

/**
 * Interface for selection state
 * 
 * @interface SelectionState
 */
export interface SelectionState {
  /** IDs of selected objects */
  selectedIds: string[];
  /** Selection bounding box */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Whether multiple objects are selected */
  isMultiSelect: boolean;
  /** Last click time for double-click detection */
  lastClickTime?: number;
  /** Last clicked object ID */
  lastClickedId?: string;
}

/**
 * Interface for layer properties
 * 
 * @interface Layer
 */
export interface Layer {
  /** Unique identifier for the layer */
  id: string;
  /** Display name of the layer */
  name: string;
  /** Whether the layer is visible */
  visible: boolean;
  /** Whether the layer is locked (prevent editing) */
  locked: boolean;
  /** Opacity of the layer (0-1) */
  opacity: number;
  /** Blend mode for the layer */
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';
  /** Index of the layer (lower = bottom, higher = top) */
  index: number;
  /** IDs of elements belonging to this layer */
  elementIds: string[];
  /** Color for layer UI (for visual distinction) */
  color?: string;
}

/**
 * Interface for layer panel state
 * 
 * @interface LayerPanelState
 */
export interface LayerPanelState {
  /** Array of layers */
  layers: Layer[];
  /** ID of the currently active layer */
  activeLayerId: string | null;
  /** Whether the layer panel is expanded */
  isExpanded: boolean;
  /** Width of the layer panel (when expanded) */
  panelWidth: number;
}