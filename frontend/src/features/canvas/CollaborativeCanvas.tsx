import React, { useRef, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../services/AuthContext';
import ColorPicker from '../../components/ui/ColorPicker';
import type { DrawingElement, Point, BrushConfig } from '../../types/canvas';
import BrushSettings from '../../components/ui/BrushSettings';
import type { BrushType, StrokeStyle } from '../../types/canvas';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import {
  Square, Circle, Edit2, Trash2, Grid, Minus, Plus,
  Eraser, MinusCircle, PlusCircle, Zap, ZapOff, Download, RotateCcw, RotateCw
} from 'lucide-react';


/**
 * Brush Engine for freehand drawing with smoothing and pressure simulation
 * 
 * @class BrushEngine
 * @description
 * Advanced brush engine that provides smooth drawing with pressure sensitivity,
 * point smoothing, and velocity-based stroke width calculations.
 * 
 * @features
 * - **Point Smoothing**: Moving average algorithm for smooth lines
 * - **Pressure Simulation**: Velocity-based pressure for natural stroke variation
 * - **Stroke Width Calculation**: Dynamic width based on drawing speed
 * - **Real-time Processing**: Efficient point processing for fluid drawing
 * 
 * @example
 * ```typescript
 * const engine = new BrushEngine({
 *   minWidth: 1,
 *   maxWidth: 10,
 *   pressureSensitive: true,
 *   smoothing: 0.7,
 *   antiAliasing: true
 * });
 * 
 * engine.addPoint({ x: 100, y: 100 }, 0.5);
 * const points = engine.getPoints();
 * ```
 */
class BrushEngine {
  /** Raw points captured from input device */
  private points: Point[] = [];

  /** Smoothed points after processing */
  private smoothedPoints: Point[] = [];

  /** Smoothing intensity factor (0-1) */
  private smoothingFactor: number = 0.5;

  /** Current pressure value (0-1) */
  private pressure: number = 1;

  /** Last calculated stroke width for smooth transitions */
  private lastWidth: number = 3;

  /** Current brush configuration */
  private config: BrushConfig;

  /**
   * Create a new BrushEngine instance
   * 
   * @constructor
   * @param {BrushConfig} config - Brush configuration parameters
   */
  constructor(config: BrushConfig) {
    this.config = config;
  }

  /**
   * Add a new point to the brush stroke with optional pressure
   * 
   * @method addPoint
   * @param {Point} point - The x,y coordinates of the point
   * @param {number} [pressure=1] - Pressure value (0-1)
   */
  addPoint(point: Point, pressure: number = 1): void {
    this.points.push(point);
    this.pressure = pressure;

    // Apply smoothing algorithm to the accumulated points
    this.applySmoothing();
  }

  /**
   * Apply smoothing to points using a moving average algorithm
   * Creates smoother curves by averaging neighboring points
   * 
   * @private
   * @method applySmoothing
   */
  private applySmoothing(): void {
    // Not enough points to smooth
    if (this.points.length < 3) {
      this.smoothedPoints = [...this.points];
      return;
    }

    const smoothed: Point[] = [];
    const kernelSize = Math.max(1, Math.floor(this.config.smoothing * 5));

    for (let i = 0; i < this.points.length; i++) {
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      // Apply moving average kernel around current point
      for (let j = -kernelSize; j <= kernelSize; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < this.points.length) {
          sumX += this.points[idx].x;
          sumY += this.points[idx].y;
          count++;
        }
      }

      // Calculate smoothed point position
      smoothed.push({
        x: sumX / count,
        y: sumY / count,
      });
    }

    this.smoothedPoints = smoothed;
  }

  /**
   * Calculate stroke width based on pressure and drawing velocity
   * Slower movement = thicker stroke, faster movement = thinner stroke
   * 
   * @method calculateStrokeWidth
   * @param {number} velocity - Current drawing velocity in pixels/ms
   * @returns {number} Calculated stroke width in pixels
   */
  calculateStrokeWidth(velocity: number): number {
    // Return fixed width if pressure sensitivity is disabled
    if (!this.config.pressureSensitive) {
      return (
        this.config.minWidth + (this.config.maxWidth - this.config.minWidth) / 2
      );
    }

    // Simulate pressure: slower movement = thicker stroke
    const pressureFactor = Math.max(0.1, Math.min(2, 1 / (velocity + 0.1)));
    const width = this.config.minWidth +
      (this.config.maxWidth - this.config.minWidth) *
      pressureFactor * this.pressure;

    // Smooth width transitions for more natural appearance
    this.lastWidth = this.lastWidth * 0.7 + width * 0.3;
    return this.lastWidth;
  }

  /**
   * Get the processed points for rendering
   * Returns smoothed points if smoothing is enabled, otherwise raw points
   * 
   * @method getPoints
   * @returns {Point[]} Array of processed points
   */
  getPoints(): Point[] {
    return this.config.smoothing > 0 ? this.smoothedPoints : this.points;
  }

  /**
   * Clear all stored points
   * 
   * @method clear
   */
  clear(): void {
    this.points = [];
    this.smoothedPoints = [];
  }

  /**
   * Check if there are enough points to render a stroke
   * 
   * @method hasPoints
   * @returns {boolean} True if there are at least 2 points
   */
  hasPoints(): boolean {
    return this.points.length > 1;
  }
}

/**
 * Interface for CollaborativeCanvas component props
 * 
 * @interface CollaborativeCanvasProps
 * @property {string} [roomId] - Optional room identifier for collaboration
 * @property {(socket: Socket) => void} [onSocketReady] - Callback when socket is connected
 */
interface CollaborativeCanvasProps {
  roomId?: string;
  onSocketReady?: (socket: Socket) => void;
}

/**
 * CollaborativeCanvas Component
 * 
 * @component
 * @description
 * An interactive, collaborative drawing canvas with real-time synchronization,
 * advanced brush engine, and multi-user support. Features include pressure
 * sensitivity, smoothing, zoom/pan, grid overlay, and remote cursor tracking.
 * 
 * @features
 * - **Real-time Collaboration**: Multi-user drawing with WebSocket synchronization
 * - **Advanced Brush Engine**: Pressure-sensitive drawing with smoothing
 * - **Multiple Tools**: Pencil, rectangle, circle, and eraser tools
 * - **Zoom & Pan**: Canvas navigation with zoom controls
 * - **Grid Overlay**: Toggleable grid for precise drawing
 * - **Remote Cursors**: Visual indicators for other users' cursors
 * - **Anti-aliasing**: High-quality rendering with smooth edges
 * - **Responsive Design**: Adapts to container size changes
 * 
 * @architecture
 * 1. Canvas element for drawing operations
 * 2. BrushEngine for smooth stroke processing
 * 3. WebSocket for real-time collaboration
 * 4. Toolbar for tool selection and settings
 * 5. State management for elements and configuration
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <CollaborativeCanvas />
 * 
 * // Collaborative room usage
 * <CollaborativeCanvas roomId="room-123" onSocketReady={(s) => setSocket(s)} />
 * ```
 * 
 * @param {CollaborativeCanvasProps} props - Component properties
 * @param {string} [props.roomId] - Room ID for collaborative session
 * @param {(socket: Socket) => void} [props.onSocketReady] - Socket ready callback
 * 
 * @returns {JSX.Element} Interactive collaborative canvas
 */
export const CollaborativeCanvas = ({ roomId, onSocketReady }: CollaborativeCanvasProps) => {
  const { user } = useAuth();

  // Canvas references
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const {
    present: elements,
    setState: setElements,
    undo,
    redo,
    canUndo,
    canRedo,
    replaceState: replaceElements
  } = useUndoRedo<DrawingElement[]>([]);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(
    null,
  );
  const [tool, setTool] = useState<
    "pencil" | "rectangle" | "circle" | "eraser"
  >("pencil");
  const [lockedObjects, setLockedObjects] = useState<
    Record<string, { userId: string; username: string; color: string }>
  >({});

  // Brush settings
  const [color, setColor] = useState<string>('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [opacity, setOpacity] = useState<number>(1);
  const [brushConfig, setBrushConfig] = useState<BrushConfig>({
    minWidth: 1,
    maxWidth: 10,
    pressureSensitive: true,
    smoothing: 0.7,
    antiAliasing: true,
  });

  // Canvas state
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number; username: string }>>({});
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Brush engine instance
  const brushEngineRef = useRef<BrushEngine | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastEmitTimeRef = useRef<number>(0);

  // Brush settings for BrushSettings component
  const [brushType, setBrushType] = useState<BrushType>('pencil');
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>({
    type: "solid",
    lineCap: "round",
    lineJoin: "round",
  });

  // Resolved room ID (canonical MongoDB _id returned by the backend socket)
  const resolvedRoomIdRef = useRef<string | undefined>(roomId);

  /**
   * Initialize WebSocket connection for real-time collaboration
   * 
   * @effect
   * @dependencies roomId, user
   * 
   * @remarks
   * Handles room joining, drawing updates, cursor tracking, and user presence
   */
  useEffect(() => {
    if (!roomId || !user) return;

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(socketUrl);
    socketRef.current = socket;

    // Join the specified room
    socket.emit('join-room', { roomId, userId: user.id || user._id });

    // Load existing room state
    socket.on('room-state', ({ drawingData, resolvedRoomId }) => {
      if (drawingData) {
        setElements(drawingData);
      }
      // Use the canonical MongoDB _id for all subsequent socket events
      if (resolvedRoomId) {
        resolvedRoomIdRef.current = resolvedRoomId;
      }
    });

    // Handle drawing updates from other users
    socket.on("drawing-update", (data: { element?: DrawingElement }) => {
      if (data.element) {
        setElements((prev: DrawingElement[]) => {
          const exists = prev.find((el: DrawingElement) => el.id === data.element!.id);

          if (exists) {
            return prev.map((el: DrawingElement) =>
              el.id === data.element!.id ? data.element! : el
            );
          }

          return [...prev, data.element!];
        });
      }
    });


    // Handle canvas clear events
    socket.on('canvas-cleared', () => {
      setElements([]);
    });

    // Track remote user cursors
    socket.on('cursor-update', ({ userId, x, y, username }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [userId]: { x, y, username: username || 'User' }
      }));
    });

    // Clean up remote cursor when user leaves
    socket.on('user-left', ({ userId }) => {
      setRemoteCursors(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    // Expose the socket to the parent component
    if (onSocketReady) {
      onSocketReady(socket);
    }

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [roomId, user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  /**
   * Initialize brush engine with current configuration
   * 
   * @effect
   * @dependencies brushConfig
   */
  useEffect(() => {
    brushEngineRef.current = new BrushEngine(brushConfig);
  }, [brushConfig]);

  /**
   * Draw grid background on canvas
   * 
   * @function drawGrid
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * 
   * @dependencies showGrid, zoomLevel, panOffset
   */
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number): void => {
    if (!showGrid) return;

    const gridSize = 20 * zoomLevel;
    ctx.strokeStyle = 'rgba(229, 231, 235, 0.5)';
    ctx.lineWidth = 1;

    // Apply zoom transformation for grid
    ctx.save();
    ctx.translate(panOffset.x * zoomLevel, panOffset.y * zoomLevel);
    ctx.scale(zoomLevel, zoomLevel);

    // Draw vertical grid lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }, [showGrid, zoomLevel, panOffset]);

  /**
   * Helper function to draw elements for export
   * 
   * @function redrawCanvasForExport
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {DrawingElement[]} elementsToDraw - Elements to draw
   * @param {number} dpr - Device pixel ratio
   */
  const redrawCanvasForExport = useCallback((
    ctx: CanvasRenderingContext2D,
    elementsToDraw: DrawingElement[],
    dpr: number
  ): void => {
    elementsToDraw.forEach((el) => {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = el.strokeStyle?.lineCap || "round";
      ctx.lineJoin = el.strokeStyle?.lineJoin || "round";
      ctx.globalAlpha = el.opacity || 1;

      // Apply dash pattern from strokeStyle
      if (el.strokeStyle?.dashArray && el.strokeStyle.dashArray.length > 0) {
        ctx.setLineDash(el.strokeStyle.dashArray);
      } else if (el.strokeStyle?.type === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else if (el.strokeStyle?.type === 'dotted') {
        ctx.setLineDash([1, 3]);
      } else {
        ctx.setLineDash([]);
      }

      switch (el.type) {
        case "pencil":
        case "eraser":
          if (el.points && el.points.length > 1) {
            ctx.moveTo(el.points[0].x / dpr, el.points[0].y / dpr);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x / dpr, el.points[i].y / dpr);
            }
          }
          break;

        case "rectangle":
          if (
            el.x !== undefined &&
            el.y !== undefined &&
            el.width !== undefined &&
            el.height !== undefined
          ) {
            ctx.strokeRect(
              el.x / dpr,
              el.y / dpr,
              el.width / dpr,
              el.height / dpr,
            );
          }
          break;

        case "circle":
          if (
            el.x !== undefined &&
            el.y !== undefined &&
            el.width !== undefined &&
            el.height !== undefined
          ) {
            const radius =
              Math.sqrt(Math.pow(el.width, 2) + Math.pow(el.height, 2)) / dpr;
            ctx.arc(el.x / dpr, el.y / dpr, Math.abs(radius), 0, 2 * Math.PI);
          }
          break;
      }

      ctx.stroke();
    });
  }, []);

  /**
   * Redraw all elements on canvas including grid and saved drawings
   * 
   * @function redrawCanvas
   * @dependencies elements, canvasSize, zoomLevel, panOffset, drawGrid, brushConfig.antiAliasing, lockedObjects
   */
  const redrawCanvas = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    drawGrid(ctx, canvas.width, canvas.height);

    // Apply transformations for elements
    ctx.save();
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(1 / dpr, 1 / dpr);
    ctx.translate(panOffset.x * zoomLevel * dpr, panOffset.y * zoomLevel * dpr);
    ctx.scale(zoomLevel, zoomLevel);

    // Enable anti-aliasing for smoother edges
    if (brushConfig.antiAliasing) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }

    // Draw all saved elements
    elements.forEach((el) => {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = el.strokeStyle?.lineCap || "round";
      ctx.lineJoin = el.strokeStyle?.lineJoin || "round";
      ctx.globalAlpha = el.opacity || 1;

      // Apply dash pattern from strokeStyle
      if (el.strokeStyle?.dashArray && el.strokeStyle.dashArray.length > 0) {
        ctx.setLineDash(el.strokeStyle.dashArray);
      } else if (el.strokeStyle?.type === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else if (el.strokeStyle?.type === 'dotted') {
        ctx.setLineDash([1, 3]);
      } else {
        ctx.setLineDash([]);
      }

      // Handle different element types
      switch (el.type) {
        case "pencil":
          if (el.points && el.points.length > 1) {
            ctx.moveTo(el.points[0].x / dpr, el.points[0].y / dpr);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x / dpr, el.points[i].y / dpr);
            }
          }
          break;

        case "rectangle":
          if (
            el.x !== undefined &&
            el.y !== undefined &&
            el.width !== undefined &&
            el.height !== undefined
          ) {
            ctx.strokeRect(
              el.x / dpr,
              el.y / dpr,
              el.width / dpr,
              el.height / dpr,
            );
          }
          break;

        case "circle":
          if (
            el.x !== undefined &&
            el.y !== undefined &&
            el.width !== undefined &&
            el.height !== undefined
          ) {
            const radius =
              Math.sqrt(Math.pow(el.width, 2) + Math.pow(el.height, 2)) / dpr;
            ctx.arc(el.x / dpr, el.y / dpr, Math.abs(radius), 0, 2 * Math.PI);
          }
          break;

        case 'eraser':
          // Eraser is implemented as a white pencil stroke
          ctx.strokeStyle = '#ffffff';
          if (el.points && el.points.length > 1) {
            ctx.moveTo(el.points[0].x / dpr, el.points[0].y / dpr);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x / dpr, el.points[i].y / dpr);
            }
          }
          break;
      }

      ctx.stroke();

      // Draw lock indicator if object is locked
      if (lockedObjects[el.id]) {
        const lockInfo = lockedObjects[el.id];
        ctx.save();
        ctx.globalAlpha = 1;

        // Get element bounds for lock badge placement
        let bx = 0,
          by = 0;
        const bw = 20,
          bh = 20;
        if (el.type === "pencil" || el.type === "eraser") {
          if (el.points && el.points.length > 0) {
            bx = el.points[0].x / dpr - 15;
            by = el.points[0].y / dpr - 15;
          }
        } else {
          bx = (el.x || 0) / dpr - 15;
          by = (el.y || 0) / dpr - 15;
        }

        // Draw lock badge background with user color
        ctx.fillStyle = lockInfo.color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        // Draw lock icon (simple unicode lock 🔒)
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 1;
        ctx.fillText("🔒", bx + bw / 2, by + bh / 2);

        ctx.restore();
      }
    });

    ctx.restore();
  }, [
    elements,
    canvasSize,
    zoomLevel,
    panOffset,
    drawGrid,
    brushConfig.antiAliasing,
    lockedObjects,
  ]);

  /**
   * Update canvas size on container resize
   * 
   * @function updateCanvasSize
   */
  const updateCanvasSize = useCallback((): void => {
    if (containerRef.current && canvasRef.current) {
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      setCanvasSize({ width, height });

      const canvas = canvasRef.current;
      // Set display size
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Set actual pixel dimensions (account for device pixel ratio)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      redrawCanvas();
    }
  }, [redrawCanvas]);

  /**
   * Setup canvas size and resize listener
   * 
   * @effect
   * @dependencies updateCanvasSize
   */
  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [updateCanvasSize]);

  /**
   * Convert mouse coordinates to canvas coordinates accounting for zoom and pan
   * 
   * @function getCanvasCoordinates
   * @param {number} clientX - Mouse X position relative to viewport
   * @param {number} clientY - Mouse Y position relative to viewport
   * @returns {Point} Transformed canvas coordinates
   */
  const getCanvasCoordinates = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = ((clientX - rect.left) / zoomLevel - panOffset.x) * dpr;
    const y = ((clientY - rect.top) / zoomLevel - panOffset.y) * dpr;

    return { x, y };
  }, [zoomLevel, panOffset]);

  /**
   * Calculate drawing velocity between two points
   * 
   * @function calculateVelocity
   * @param {Point} currentPoint - Current point
   * @param {Point} lastPoint - Previous point
   * @param {number} timeDelta - Time elapsed in milliseconds
   * @returns {number} Velocity in pixels per millisecond
   */
  const calculateVelocity = (
    currentPoint: Point,
    lastPoint: Point,
    timeDelta: number,
  ): number => {
    if (!lastPoint || timeDelta === 0) return 0;

    const dx = currentPoint.x - lastPoint.x;
    const dy = currentPoint.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance / timeDelta;
  };

  /**
   * Start drawing operation at the specified mouse position
   * 
   * @function startDrawing
   * @param {React.MouseEvent} e - Mouse event
   * @dependencies tool, color, strokeWidth, opacity, getCanvasCoordinates
   */
  const startDrawing = useCallback((e: React.MouseEvent): void => {
    const point = getCanvasCoordinates(e.clientX, e.clientY);
    setIsDrawing(true);
    lastPointRef.current = point;
    lastTimeRef.current = Date.now();

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const newElement: DrawingElement = (tool === 'pencil' || tool === 'eraser') ? {
      id,
      type: tool,
      points: [point],
      color: tool === 'eraser' ? '#ffffff' : color,
      strokeWidth,
      opacity,
      strokeStyle: { ...strokeStyle },
    } : {
      id,
      type: tool,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      color,
      strokeWidth,
      opacity,
      strokeStyle: { ...strokeStyle },
    };

    setCurrentElement(newElement);
  }, [tool, color, strokeWidth, opacity, strokeStyle, getCanvasCoordinates]);

  /**
   * Update drawing while mouse moves
   * 
   * @function draw
   * @param {React.MouseEvent} e - Mouse move event
   */
  const draw = (e: React.MouseEvent): void => {
    if (!isDrawing || !currentElement) return;

    const { clientX, clientY } = e;
    const point = getCanvasCoordinates(clientX, clientY);

    // Emit cursor movement to other users
    if (socketRef.current && resolvedRoomIdRef.current && user) {
      socketRef.current.emit("cursor-move", {
        roomId: resolvedRoomIdRef.current,
        x: point.x,
        y: point.y,
        userId: user.id || user._id,
        username: user.username || user.fullName,
      });
    }

    const currentTime = Date.now();
    const timeDelta = currentTime - lastTimeRef.current;

    if ((tool === "pencil" || tool === "eraser") && brushEngineRef.current) {
      // Calculate velocity for pressure simulation
      const velocity = calculateVelocity(
        point,
        lastPointRef.current!,
        timeDelta,
      );

      // Simulate pressure based on velocity (slower = higher pressure)
      const pressure = Math.max(0.1, Math.min(1, 100 / (velocity + 10)));

      // Add point with simulated pressure to brush engine
      brushEngineRef.current.addPoint(point, pressure);

      // Update current element with brush engine points
      const updatedElement: DrawingElement = {
        ...currentElement,
        points: brushEngineRef.current.getPoints(),
        strokeWidth: brushEngineRef.current.calculateStrokeWidth(velocity),
      };

      setCurrentElement(updatedElement);
      redrawCurrentStroke(updatedElement);

      // Emit real-time update to other users (throttled to 50ms)
      if (socketRef.current && resolvedRoomIdRef.current && currentTime - lastEmitTimeRef.current > 50) {
        socketRef.current.emit('drawing-update', {
          roomId: resolvedRoomIdRef.current,
          element: updatedElement,
          saveToDb: false,
        });
        lastEmitTimeRef.current = currentTime;
      }
    } else {
      // Update shape dimensions for rectangle/circle tools
      const updatedElement: DrawingElement = {
        ...currentElement,
        width: point.x - (currentElement.x || 0),
        height: point.y - (currentElement.y || 0),
      };

      setCurrentElement(updatedElement);
      redrawCanvas();
    }

    lastPointRef.current = point;
    lastTimeRef.current = currentTime;
  };

  /**
   * Stop drawing and finalize the element
   * Adds completed element to the elements array and emits to server
   */
  const stopDrawing = (): void => {
    if (!isDrawing || !currentElement) return;

    setIsDrawing(false);

    // Only add to elements if it's a valid drawing
    if (tool === "pencil" || tool === "eraser") {
      if (brushEngineRef.current?.hasPoints()) {
        setElements([...elements, currentElement]); // Use setState instead of setElements
        if (socketRef.current && resolvedRoomIdRef.current) {
          socketRef.current.emit("drawing-update", {
            roomId: resolvedRoomIdRef.current,
            element: currentElement,
            saveToDb: true,
          });
        }
      }
    } else {
      // For shapes, check if they have valid dimensions
      if (
        Math.abs(currentElement.width || 0) > 1 ||
        Math.abs(currentElement.height || 0) > 1
      ) {
        setElements([...elements, currentElement]); // Use setState instead of setElements
        if (socketRef.current && resolvedRoomIdRef.current) {
          socketRef.current.emit("drawing-update", {
            roomId: resolvedRoomIdRef.current,
            element: currentElement,
            saveToDb: true,
          });
        }
      }
    }

    // Emit object unlock event
    if (socketRef.current && resolvedRoomIdRef.current && currentElement) {
      socketRef.current.emit("unlock-object", {
        roomId: resolvedRoomIdRef.current,
        elementId: currentElement.id,
      });
    }

    setCurrentElement(null);
    if (brushEngineRef.current) {
      brushEngineRef.current.clear();
    }
  };

  /**
   * Draw current stroke in real-time (for pencil/eraser tools)
   * 
   * @function redrawCurrentStroke
   * @param {DrawingElement} element - Current drawing element to render
   */
  const redrawCurrentStroke = (element: DrawingElement): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all saved elements
    redrawCanvas();

    // Draw current stroke on top
    if (
      (element.type === "pencil" || element.type === "eraser") &&
      element.points &&
      element.points.length > 1
    ) {
      ctx.save();

      // Apply transformations
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(1 / dpr, 1 / dpr);
      ctx.translate(
        panOffset.x * zoomLevel * dpr,
        panOffset.y * zoomLevel * dpr,
      );
      ctx.scale(zoomLevel, zoomLevel);

      // Set drawing properties
      ctx.strokeStyle = element.type === "eraser" ? "#ffffff" : element.color;
      ctx.lineWidth = element.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = element.opacity || 1;

      // Enable anti-aliasing
      if (brushConfig.antiAliasing) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
      }

      // Draw the stroke
      ctx.beginPath();
      ctx.moveTo(element.points[0].x / dpr, element.points[0].y / dpr);

      for (let i = 1; i < element.points.length; i++) {
        ctx.lineTo(element.points[i].x / dpr, element.points[i].y / dpr);
      }

      ctx.stroke();
      ctx.restore();
    }
  };

  /**
   * Export canvas as image
   * 
   * @function handleExport
   * @param {string} format - Image format (png, jpeg)
   */
  const handleExport = async (format: 'png' | 'jpeg'): Promise<void> => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);

    try {
      // Create a temporary canvas for export
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) return;

      // Set export canvas size
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;

      // Draw white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Apply the same transformations and draw all elements
      ctx.save();
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(1 / dpr, 1 / dpr);
      ctx.translate(panOffset.x * zoomLevel * dpr, panOffset.y * zoomLevel * dpr);
      ctx.scale(zoomLevel, zoomLevel);

      // Redraw all elements
      redrawCanvasForExport(ctx, elements, dpr);

      ctx.restore();

      // Convert to data URL and trigger download
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = exportCanvas.toDataURL(mimeType, 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `canvas-export-${Date.now()}.${format}`;
      link.click();

    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle zoom in operation
   */
  const handleZoomIn = (): void => setZoomLevel(prev => Math.min(prev + 0.25, 3));

  /**
   * Handle zoom out operation
   */
  const handleZoomOut = (): void => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));

  /**
   * Reset zoom and pan to default values
   */
  const handleResetZoom = (): void => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  /**
   * Update brush configuration with partial updates
   * 
   * @function updateBrushConfig
   * @param {Partial<BrushConfig>} updates - Partial brush configuration updates
   */
  const updateBrushConfig = (updates: Partial<BrushConfig>): void => {
    setBrushConfig(prev => ({ ...prev, ...updates }));
  };

  /**
   * Redraw canvas when dependencies change
   * 
   * @effect
   * @dependencies redrawCanvas
   */
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-100 overflow-hidden dark:bg-slate-900"
    >
      {/* Enhanced toolbar */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 z-10"
        role="toolbar"
        aria-label="Drawing tools"
      >
        {/* Drawing tools */}
        <div className="flex border-r border-slate-200 dark:border-slate-700 pr-4 gap-1">
          <button
            onClick={() => setTool('pencil')}
            className={`p-2 rounded-lg transition-colors ${tool === 'pencil'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            aria-label="Pencil tool"
            title="Pencil Tool"
            aria-pressed={tool === 'pencil'}
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={() => setTool('rectangle')}
            className={`p-2 rounded-lg transition-colors ${tool === 'rectangle'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            aria-label="Rectangle tool"
            title="Rectangle Tool"
            aria-pressed={tool === 'rectangle'}
          >
            <Square size={20} />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded-lg transition-colors ${tool === 'circle'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            aria-label="Circle tool"
            title="Circle Tool"
            aria-pressed={tool === 'circle'}
          >
            <Circle size={20} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-colors ${tool === 'eraser'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            aria-label="Eraser tool"
            title="Eraser Tool"
            aria-pressed={tool === 'eraser'}
          >
            <Eraser size={20} />
          </button>
        </div>

        {/* Color picker with opacity */}
        <ColorPicker
          value={color}
          onChange={setColor}
          opacity={opacity}
          onOpacityChange={setOpacity}
          className="border-r border-slate-200 dark:border-slate-700 pr-4"
        />

        {/* Stroke width and brush settings */}
        <BrushSettings
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          brushType={brushType}
          onBrushTypeChange={setBrushType}
          pressureSensitive={brushConfig.pressureSensitive}
          onPressureSensitiveChange={(enabled) =>
            setBrushConfig((prev) => ({ ...prev, pressureSensitive: enabled }))
          }
          strokeStyle={strokeStyle}
          onStrokeStyleChange={setStrokeStyle}
          className="border-r border-slate-200 dark:border-slate-700 pr-4"
        />

        {/* Brush settings */}
        <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-700 pr-4">
          <div className="flex flex-col items-center">
            <button
              onClick={() => updateBrushConfig({ pressureSensitive: !brushConfig.pressureSensitive })}
              className={`p-1.5 rounded ${brushConfig.pressureSensitive
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400'
                }`}
              aria-label={brushConfig.pressureSensitive ? "Disable pressure sensitivity" : "Enable pressure sensitivity"}
              title="Pressure Sensitivity"
              aria-pressed={brushConfig.pressureSensitive}
            >
              {brushConfig.pressureSensitive ? (
                <Zap size={16} />
              ) : (
                <ZapOff size={16} />
              )}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">Pressure</span>
          </div>

          <div className="flex flex-col items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={brushConfig.smoothing}
              onChange={(e) =>
                updateBrushConfig({ smoothing: parseFloat(e.target.value) })
              }
              className="w-16"
              aria-label="Brush smoothing"
              title="Smoothing"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">Smooth</span>
          </div>
        </div>

        {/* Undo Redo controls */}
        <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-4">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-colors ${canUndo
              ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              }`}
            aria-label="Undo (Ctrl+Z)"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-colors ${canRedo
              ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              }`}
            aria-label="Redo (Ctrl+Y)"
            title="Redo (Ctrl+Y)"
            disabled={!canRedo}
          >
            <RotateCw size={20} />
          </button>
        </div>

        {/* Canvas controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${showGrid
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            aria-label={showGrid ? "Hide grid" : "Show grid"}
            title="Toggle Grid"
            aria-pressed={showGrid}
          >
            <Grid size={20} />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              aria-label="Zoom out"
              title="Zoom Out"
            >
              <Minus size={16} />
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              aria-label="Zoom in"
              title="Zoom In"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={handleResetZoom}
            className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            aria-label="Reset zoom"
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>

        {/* Clear canvas button */}
        <button
          onClick={() => {
            setElements([]);
            if (socketRef.current && roomId) {
              socketRef.current.emit("clear-canvas", { roomId });
            }
          }}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          aria-label="Clear all drawings"
          title="Clear Canvas"
        >
          <Trash2 size={20} />
        </button>

        {/* Export button with dropdown */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleExport('png')}
            disabled={isExporting}
            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export as PNG"
            title="Export as PNG"
          >
            <Download size={20} />
          </button>
          <button
            onClick={() => handleExport('jpeg')}
            disabled={isExporting}
            className="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export as JPEG"
          >
            {isExporting ? 'Exporting...' : 'JPEG'}
          </button>
        </div>
      </div>

      {/* Canvas info overlay */}
      <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-400">
        {Math.round(canvasSize.width)} × {Math.round(canvasSize.height)} px
        {brushConfig.pressureSensitive && " • Pressure: On"}
        {brushConfig.smoothing > 0 &&
          ` • Smoothing: ${brushConfig.smoothing.toFixed(1)}`}
      </div>

      {/* Main drawing canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="absolute top-0 left-0 w-full h-full bg-white dark:bg-slate-900 cursor-crosshair"
        aria-label="Collaborative drawing canvas"
        title="Drawing area - Click and drag to draw"
      />

      {/* Remote Cursors Overlay */}
      {Object.entries(remoteCursors).map(([id, pos]) => {
        // Don't show current user's cursor
        if (id === (user?.id || user?._id)) return null;
        return (
          <div
            key={id}
            className="absolute pointer-events-none z-50 transition-all duration-75 ease-linear"
            style={{
              left: `${(pos.x / (window.devicePixelRatio || 1)) * zoomLevel + panOffset.x * zoomLevel}px`,
              top: `${(pos.y / (window.devicePixelRatio || 1)) * zoomLevel + panOffset.y * zoomLevel}px`,
            }}
            aria-label={`${pos.username}'s cursor`}
          >
            {/* Custom cursor SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill="#3B82F6" stroke="white" />
            </svg>
            <div className="ml-3 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded shadow-sm whitespace-nowrap">
              {pos.username}
            </div>
          </div>
        );
      })}
    </div>
  );
};