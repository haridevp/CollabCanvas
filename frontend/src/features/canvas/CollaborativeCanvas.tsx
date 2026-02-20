import React, { useRef, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../services/AuthContext';
import ColorPicker from '../../components/ui/ColorPicker';
import type { DrawingElement, ImageElement, Point, BrushConfig, TextFormat, TextElement, BrushType, StrokeStyle } from '../../types/canvas';
import BrushSettings from '../../components/ui/BrushSettings';
import TextEditor from '../../components/ui/TextEditor';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import ImageUploader from '../../components/ui/ImageUploader';
import { useSelection } from '../../hooks/useSelection';
import { useClipboard } from '../../hooks/useClipboard';
import { ContextMenu } from '../../components/ui/ContextMenu';
import { useLayers } from '../../hooks/useLayers';
import { LayerPanel } from '../../components/ui/LayerPanel';
import { useObjectLocks } from '../../hooks/useObjectLocks';
import { getToolIcon, getToolLabel, getToolColor } from '../../utils/toolIcons';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkStatus } from '../../components/ui/NetworkStatus';
import {
  Square, Circle, Edit2, Trash2, Grid, Minus, Plus, X, Lock,
  Eraser, MinusCircle, PlusCircle, Zap, ZapOff, Download, RotateCcw, RotateCw,
  Type, Minus as LineIcon, ArrowRight, Image as ImageIcon, Move, Copy, Scissors,
  ArrowUp, ArrowDown, Trash, Clipboard
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
  // Resolved room ID (canonical MongoDB _id returned by the backend socket)
  const resolvedRoomIdRef = useRef<string | undefined>(roomId);

  // Text Input
  const [isEditingText, setIsEditingText] = useState<boolean>(false);
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [editingTextElement, setEditingTextElement] = useState<TextElement | null>(null);
  const defaultTextFormat: TextFormat = {
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    color: '#000000'
  };

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
    "pencil" | "rectangle" | "circle" | "line" | "arrow" | "text" | "eraser" | "select" | "image"
  >("pencil");

  // Image Uploading State
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imagePosition, setImagePosition] = useState<Point | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

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
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number; username: string; tool?: string; color?: string }>>({});
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

  const {
    selection,
    setSelection,
    transform,
    dragBox,
    handleSelectionStart,
    handleDragBox,
    handleSelectionEnd,
    startMove,
    startResize,
    handleTransform,
    endTransform,
    clearSelection,
    deleteSelected,
    duplicateSelected,
    bringToFront,
    sendToBack,
    findElementAtPoint
  } = useSelection(elements, setElements, zoomLevel, panOffset);

  const {
    copyToClipboard,
    cutToClipboard,
    pasteFromClipboard,
    hasClipboardContent
  } = useClipboard(
    elements,
    setElements,
    selection.selectedIds,
    clearSelection,
    (newSelection) => setSelection({
      selectedIds: newSelection.selectedIds,
      isMultiSelect: newSelection.isMultiSelect
    })
  );

  const {
    layerState,
    createLayer,
    deleteLayer,
    duplicateLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setActiveLayer,
    renameLayer,
    setLayerOpacity,
    setLayerBlendMode,
    reorderLayers,
    mergeLayerDown,
    getLayerElements,
    isLayerEditable,
    updateLayerElementCounts,
    setLayerState
  } = useLayers(elements, setElements);

  const {
    isOnline,
    isConnected,
    latency,
    packetLoss,
    actionQueue,
    isSyncing,
    queueAction,
    processQueue,
    clearQueue,
    getQueueStatus
  } = useNetworkStatus(socketRef.current, () => {
    // On reconnect callback
    console.log('Connection restored, processing queue...');
    processQueue();
  });

  const {
    lockedObjects,
    myLocks,
    requestLock,
    releaseLock,
    isLocked,
    isLockedByMe,
    getLockInfo
  } = useObjectLocks({
    socket: socketRef.current,
    roomId: resolvedRoomIdRef.current,
    userId: user?.id || user?._id,
    username: user?.username || user?.fullName,
    userColor: color,
    lockTimeout: 30000,
    isConnected: isConnected, // From useNetworkStatus
    queueAction: queueAction // From useNetworkStatus
  });

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  /**
 * Handle context menu (right-click)
 */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    // Only show context menu in select tool
    if (tool === 'select') {
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  }, [tool]);


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
    socket.on("room-state", ({ drawingData, resolvedRoomId }) => {
      if (resolvedRoomId) {
        resolvedRoomIdRef.current = resolvedRoomId;
      }

      if (drawingData) {
        replaceElements(drawingData);
      }
    });


    // Handle drawing updates from other users
    socket.on("drawing-update", (data: { element?: DrawingElement; userId?: string }) => {
      if (!data.element) return;

      const myId = user.id || user._id;
      if (data.userId === myId) return; // ✅ ignore self

      replaceElements((prev) => {
        const exists = prev.find((el) => el.id === data.element!.id);
        if (exists) {
          return prev.map((el) => (el.id === data.element!.id ? data.element! : el));
        }
        return [...prev, data.element!];
      });
    });

    // Handle canvas clear events
    socket.on('canvas-cleared', () => {
      replaceElements([]);
    });

    // Track remote user cursors with tool info
    socket.on('cursor-update', ({ userId, x, y, username, tool, color }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [userId]: {
          x,
          y,
          username: username || 'User',
          tool: tool || 'select',
          color: color || '#3b82f6'
        }
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
  }, [roomId, user, replaceElements, onSocketReady]);

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
      ctx.save();
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
          if (el.type === "eraser") {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = "rgba(0,0,0,1)";
          }
          if (el.points && el.points.length > 1) {
            ctx.moveTo(el.points[0].x / dpr, el.points[0].y / dpr);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x / dpr, el.points[i].y / dpr);
            }
            ctx.stroke();
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
            const radius = Math.sqrt(el.width ** 2 + el.height ** 2) / dpr;
            ctx.arc(el.x / dpr, el.y / dpr, Math.abs(radius), 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case "line":
        case "arrow":
          if (el.points && el.points.length === 2) {
            const [start, end] = el.points;
            ctx.moveTo(start.x / dpr, start.y / dpr);
            ctx.lineTo(end.x / dpr, end.y / dpr);
            ctx.stroke();

            // Draw arrowhead if it's an arrow
            if (el.type === 'arrow') {
              drawArrowhead(ctx, start, end, el.strokeWidth * 3, dpr);
            }
          }
          break;

        case "text": {
          const textEl = el as TextElement;
          ctx.font = `${textEl.format.fontStyle} ${textEl.format.fontWeight} ${textEl.format.fontSize}px ${textEl.format.fontFamily}`;
          ctx.fillStyle = textEl.format.color;
          ctx.textAlign = textEl.format.textAlign;
          ctx.textBaseline = "top";

          const lines = textEl.text.split("\n");
          const x = textEl.x! / dpr;
          const y = textEl.y! / dpr;

          lines.forEach((line, index) => {
            ctx.fillText(
              line,
              x,
              y + index * textEl.format.fontSize * 1.2
            );
          });
          break;
        }

        case "image": {
          const imageEl = el as ImageElement;
          const img = new Image();
          img.src = imageEl.src;
          if (img.complete) {
            ctx.drawImage(
              img,
              imageEl.x! / dpr,
              imageEl.y! / dpr,
              imageEl.width / dpr,
              imageEl.height / dpr
            );
          }
          break;
        }
      }
      ctx.restore();
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid(ctx, canvas.width, canvas.height);

    ctx.save();
    const dpr = window.devicePixelRatio || 1;

    ctx.scale(1 / dpr, 1 / dpr);
    ctx.translate(panOffset.x * zoomLevel * dpr, panOffset.y * zoomLevel * dpr);
    ctx.scale(zoomLevel, zoomLevel);

    if (brushConfig.antiAliasing) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }

    // ================================
    // LAYER-AWARE RENDERING
    // ================================

    const sortedLayers = [...layerState.layers].sort(
      (a, b) => a.index - b.index
    );

    const drawSingleElement = (el: DrawingElement, layerOpacity: number = 1) => {
      ctx.save();

      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = el.strokeStyle?.lineCap || "round";
      ctx.lineJoin = el.strokeStyle?.lineJoin || "round";

      // Combine element + layer opacity
      ctx.globalAlpha = (el.opacity ?? 1) * layerOpacity;

      // Dash styles
      if (el.strokeStyle?.dashArray?.length) {
        ctx.setLineDash(el.strokeStyle.dashArray);
      } else if (el.strokeStyle?.type === "dashed") {
        ctx.setLineDash([5, 5]);
      } else if (el.strokeStyle?.type === "dotted") {
        ctx.setLineDash([1, 3]);
      } else {
        ctx.setLineDash([]);
      }

      switch (el.type) {
        case "pencil":
        case "eraser":
          if (el.type === "eraser") {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = "rgba(0,0,0,1)";
          }

          if (el.points && el.points.length > 1) {
            ctx.moveTo(el.points[0].x / dpr, el.points[0].y / dpr);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x / dpr, el.points[i].y / dpr);
            }
            ctx.stroke();
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
              el.height / dpr
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
            const radius = Math.sqrt(el.width ** 2 + el.height ** 2) / dpr;
            ctx.arc(
              el.x / dpr,
              el.y / dpr,
              Math.abs(radius),
              0,
              2 * Math.PI
            );
            ctx.stroke();
          }
          break;

        case "line":
        case "arrow":
          if (el.points && el.points.length === 2) {
            const [start, end] = el.points;
            ctx.moveTo(start.x / dpr, start.y / dpr);
            ctx.lineTo(end.x / dpr, end.y / dpr);
            ctx.stroke();

            if (el.type === 'arrow') {
              drawArrowhead(ctx, start, end, el.strokeWidth * 3, dpr);
            }
          }
          break;

        case "text": {
          const textEl = el as TextElement;
          ctx.font = `${textEl.format.fontStyle} ${textEl.format.fontWeight} ${textEl.format.fontSize}px ${textEl.format.fontFamily}`;
          ctx.fillStyle = textEl.format.color;
          ctx.textAlign = textEl.format.textAlign;
          ctx.textBaseline = "top";

          const lines = textEl.text.split("\n");
          const x = textEl.x! / dpr;
          const y = textEl.y! / dpr;

          lines.forEach((line, index) => {
            ctx.fillText(
              line,
              x,
              y + index * textEl.format.fontSize * 1.2
            );
          });
          break;
        }

        case "image": {
          const imageEl = el as ImageElement;
          const img = new Image();
          img.src = imageEl.src;

          if (img.complete) {
            ctx.drawImage(
              img,
              imageEl.x! / dpr,
              imageEl.y! / dpr,
              imageEl.width / dpr,
              imageEl.height / dpr
            );
          } else {
            img.onload = () => redrawCanvas();
          }
          break;
        }
      }

      // ================================
      // SELECTION HIGHLIGHT
      // ================================
      if (selection.selectedIds.includes(el.id)) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2 / zoomLevel;
        ctx.setLineDash([5 / zoomLevel, 5 / zoomLevel]);

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
            el.height / dpr
          );
        } else if (el.points && el.points.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          el.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
          ctx.strokeRect(
            minX / dpr,
            minY / dpr,
            (maxX - minX) / dpr,
            (maxY - minY) / dpr
          );
        }
        ctx.restore();
      }

      ctx.restore();
    };

    sortedLayers.forEach((layer) => {
      if (!layer.visible) return;

      const layerElements = elements.filter(
        (el) => el.layerId === layer.id
      );

      layerElements.forEach((el) => {
        drawSingleElement(el, layer.opacity);
      });
    });

    if (currentElement) {
      drawSingleElement(currentElement, 1);
    }

    ctx.restore();
  }, [
    elements,
    currentElement,
    layerState.layers,
    zoomLevel,
    panOffset,
    drawGrid,
    brushConfig.antiAliasing,
    selection.selectedIds
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
 * Draw arrowhead at the end of a line
 */
  const drawArrowhead = (
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    size: number,
    dpr: number
  ): void => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowSize = size / dpr;

    const x = end.x / dpr;
    const y = end.y / dpr;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowSize, -arrowSize / 2);
    ctx.lineTo(-arrowSize, arrowSize / 2);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
  };

  /**
 * Handle saving text from text editor
 */
  const handleTextSave = useCallback((text: string, format: TextFormat): void => {
    if (!textPosition) return;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const textElement: TextElement = {
      id,
      type: 'text',
      text,
      format,
      x: textPosition.x,
      y: textPosition.y,
      color: format.color,
      strokeWidth: 0, // Text doesn't use stroke width
      opacity: 1,
    };

    // Add to history and emit to server
    setElements([...elements, textElement]);

    if (socketRef.current && resolvedRoomIdRef.current) {
      socketRef.current.emit("drawing-update", {
        roomId: resolvedRoomIdRef.current,
        element: textElement,
        saveToDb: true,
      });
    }

    // Reset text editing state
    setIsEditingText(false);
    setTextPosition(null);
  }, [elements, setElements, textPosition]);

  /**
 * Handle image upload and placement on canvas
 */
  const handleImageUpload = useCallback((imageData: { src: string; width: number; height: number }): void => {
    if (!imagePosition) return;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Scale image to fit within reasonable bounds while maintaining aspect ratio
    const maxSize = 400; // Maximum width or height
    let displayWidth = imageData.width;
    let displayHeight = imageData.height;

    if (displayWidth > maxSize || displayHeight > maxSize) {
      const ratio = Math.min(maxSize / displayWidth, maxSize / displayHeight);
      displayWidth = Math.round(displayWidth * ratio);
      displayHeight = Math.round(displayHeight * ratio);
    }

    const imageElement: ImageElement = {
      id,
      type: 'image',
      src: imageData.src,
      x: imagePosition.x,
      y: imagePosition.y,
      width: displayWidth,
      height: displayHeight,
      originalWidth: imageData.width,
      originalHeight: imageData.height,
      color: '#000000', // Not used for images but required by DrawingElement
      strokeWidth: 0,
      opacity: 1,
    };

    // Add to history and emit to server
    setElements([...elements, imageElement]);

    if (socketRef.current && resolvedRoomIdRef.current) {
      socketRef.current.emit("drawing-update", {
        roomId: resolvedRoomIdRef.current,
        element: imageElement,
        saveToDb: true,
      });
    }

    // Reset state
    setIsUploadingImage(false);
    setImagePosition(null);
    setTool('select'); // Switch to select tool after placing image
  }, [elements, setElements, imagePosition]);

  /**
   * Start drawing operation at the specified mouse position
   * 
   * @function startDrawing
   * @param {React.MouseEvent} e - Mouse event
   * @dependencies tool, color, strokeWidth, opacity, getCanvasCoordinates
   */
  const startDrawing = useCallback((e: React.MouseEvent): void => {
    const point = getCanvasCoordinates(e.clientX, e.clientY);

    // ----------------------------------
    // Validate active layer
    // ----------------------------------
    if (!layerState.activeLayerId) return;

    if (!isLayerEditable(layerState.activeLayerId)) {
      return;
    }

    // ----------------------------------
    // SELECT TOOL
    // ----------------------------------
    if (tool === "select") {
      handleSelectionStart(e, point);

      const element = findElementAtPoint(point);

      if (element) {
        // Block interaction if locked by someone else
        if (isLocked(element.id) && !isLockedByMe(element.id)) {
          return;
        }

        // Request lock before modifying
        requestLock(element.id);

        if (selection.selectedIds.includes(element.id)) {
          startMove(e, point);
        }
      }

      return;
    }

    // ----------------------------------
    // TEXT TOOL
    // ----------------------------------
    if (tool === "text") {
      setTextPosition(point);
      setIsEditingText(true);
      setEditingTextElement(null);
      return;
    }

    // ----------------------------------
    // IMAGE TOOL
    // ----------------------------------
    if (tool === "image") {
      setImagePosition(point);
      setIsUploadingImage(true);
      return;
    }

    // ----------------------------------
    // DRAWING TOOLS
    // ----------------------------------

    setIsDrawing(true);
    lastPointRef.current = point;
    lastTimeRef.current = Date.now();

    const id = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 5)}`;

    const baseElement = {
      id,
      type: tool,
      color: tool === "eraser" ? "#ffffff" : color,
      strokeWidth,
      opacity,
      strokeStyle: { ...strokeStyle },
      layerId: layerState.activeLayerId, // ✅ Assign layer HERE
    };

    const newElement: DrawingElement =
      tool === "pencil" || tool === "eraser"
        ? {
          ...baseElement,
          points: [point],
        }
        : {
          ...baseElement,
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          points:
            tool === "line" || tool === "arrow"
              ? [point, point]
              : undefined,
        };

    // ----------------------------------
    // Lock the element BEFORE editing
    // ----------------------------------
    requestLock(id);

    setCurrentElement(newElement);
  }, [
    tool,
    color,
    strokeWidth,
    opacity,
    strokeStyle,
    getCanvasCoordinates,
    handleSelectionStart,
    findElementAtPoint,
    selection.selectedIds,
    startMove,
    layerState.activeLayerId,
    isLayerEditable,
    isLocked,
    isLockedByMe,
    requestLock,
  ]);

  /**
   * Update drawing while mouse moves
   * 
   * @function draw
   * @param {React.MouseEvent} e - Mouse move event
   */
  const draw = useCallback((e: React.MouseEvent): void => {
    const { clientX, clientY } = e;
    const point = getCanvasCoordinates(clientX, clientY);

    const currentTime = Date.now();

    // --------------------------------------------------
    // Emit cursor movement with tool information
    // --------------------------------------------------
    if (user) {
      const cursorData = {
        roomId: resolvedRoomIdRef.current,
        x: point.x,
        y: point.y,
        userId: user.id || user._id,
        username: user.username || user.fullName,
        tool: tool,
        color: color,
      };

      if (socketRef.current && resolvedRoomIdRef.current && isConnected) {
        socketRef.current.emit("cursor-move", cursorData);
      } else {
        // Optional: Usually DO NOT queue high-frequency cursor events
        // queueAction("cursor-move", cursorData);
      }
    }

    // --------------------------------------------------
    // Selection Drag Box
    // --------------------------------------------------
    if (tool === "select" && dragBox && !transform.isTransforming) {
      handleDragBox(point);
      redrawCanvas();
      return;
    }

    // --------------------------------------------------
    // Transformation
    // --------------------------------------------------
    if (transform.isTransforming) {
      handleTransform(point);
      redrawCanvas();
      return;
    }

    // --------------------------------------------------
    // Drawing Guard
    // --------------------------------------------------
    if (!isDrawing || !currentElement) return;

    const timeDelta = currentTime - lastTimeRef.current;

    // --------------------------------------------------
    // Pencil / Eraser (Brush Engine)
    // --------------------------------------------------
    if ((tool === "pencil" || tool === "eraser") && brushEngineRef.current) {
      const velocity = calculateVelocity(
        point,
        lastPointRef.current!,
        timeDelta
      );

      // Simulated pressure (slower movement = thicker stroke)
      const pressure = Math.max(0.1, Math.min(1, 100 / (velocity + 10)));

      brushEngineRef.current.addPoint(point, pressure);

      const updatedElement: DrawingElement = {
        ...currentElement,
        points: brushEngineRef.current.getPoints(),
        strokeWidth:
          brushEngineRef.current.calculateStrokeWidth(velocity),
      };

      setCurrentElement(updatedElement);
      redrawCanvas();

      // ----------------------------------------------
      // Throttled Real-time Emit (50ms)
      // ----------------------------------------------
      if (
        socketRef.current &&
        resolvedRoomIdRef.current &&
        currentTime - lastEmitTimeRef.current > 50
      ) {
        const payload = {
          roomId: resolvedRoomIdRef.current,
          element: updatedElement,
          userId: user?.id || user?._id,
          saveToDb: false,
        };

        if (isConnected) {
          socketRef.current.emit("drawing-update", payload);
        } else {
          queueAction("drawing-update", payload);
        }

        lastEmitTimeRef.current = currentTime;
      }
    }

    // --------------------------------------------------
    // Shape Tools (Rect, Circle, Line, Arrow)
    // --------------------------------------------------
    else {
      const updatedElement: DrawingElement = {
        ...currentElement,
        width: point.x - (currentElement.x || 0),
        height: point.y - (currentElement.y || 0),
        points:
          currentElement.type === "line" ||
            currentElement.type === "arrow"
            ? [
              { x: currentElement.x!, y: currentElement.y! },
              point,
            ]
            : undefined,
      };

      setCurrentElement(updatedElement);
      redrawCanvas();

      // Optional: You can also throttle emit shapes in real-time if needed
    }

    lastPointRef.current = point;
    lastTimeRef.current = currentTime;
  }, [
    isDrawing,
    currentElement,
    tool,
    user,
    color,
    isConnected,
    dragBox,
    transform,
    getCanvasCoordinates,
    handleTransform,
    handleDragBox,
    redrawCanvas,
  ]);

  /**
   * Mouse Handle (up)
   */
  const handleMouseUp = useCallback((e: React.MouseEvent): void => {
    const point = getCanvasCoordinates(e.clientX, e.clientY);

    // ---------------------------------
    // SELECT TOOL
    // ---------------------------------
    if (tool === "select") {
      if (dragBox) {
        handleSelectionEnd(point);
      }

      if (transform.isTransforming) {
        endTransform();

        const socket = socketRef.current;
        const resolvedRoomId = resolvedRoomIdRef.current;

        if (
          socket &&
          resolvedRoomId &&
          selection.selectedIds.length > 0
        ) {
          selection.selectedIds.forEach((id) => {
            const element = elements.find((el) => el.id === id);
            if (element) {
              socket.emit("drawing-update", {
                roomId: resolvedRoomId,
                element,
                saveToDb: true,
                userId: user?.id || user?._id,
              });
            }
          });
        }

        // 🔒 DO NOT release lock here
        // Keep lock until deselect for better UX
      }

      return;
    }

    // ---------------------------------
    // DRAWING TOOLS
    // ---------------------------------

    if (!isDrawing || !currentElement) return;

    setIsDrawing(false);

    let shouldSave = false;

    switch (currentElement.type) {
      case "pencil":
      case "eraser":
        shouldSave = !!brushEngineRef.current?.hasPoints();
        break;

      case "line":
      case "arrow":
        if (currentElement.points?.length === 2) {
          const [start, end] = currentElement.points;
          const distance = Math.sqrt(
            Math.pow(end.x - start.x, 2) +
            Math.pow(end.y - start.y, 2)
          );
          shouldSave = distance > 5;
        }
        break;

      case "rectangle":
      case "circle":
        shouldSave =
          Math.abs(currentElement.width ?? 0) > 5 &&
          Math.abs(currentElement.height ?? 0) > 5;
        break;
    }

    if (shouldSave) {
      const elementWithLayer = {
        ...currentElement,
        layerId:
          currentElement.layerId ??
          layerState.activeLayerId!,
      };

      setElements((prev) => [...prev, elementWithLayer]);

      if (socketRef.current && resolvedRoomIdRef.current) {
        socketRef.current.emit("drawing-update", {
          roomId: resolvedRoomIdRef.current,
          element: elementWithLayer,
          saveToDb: true,
          userId: user?.id || user?._id,
        });
      }
    }

    // ---------------------------------
    // Always release lock after drawing
    // ---------------------------------

    if (socketRef.current && resolvedRoomIdRef.current) {
      socketRef.current.emit("unlock-object", {
        roomId: resolvedRoomIdRef.current,
        elementId: currentElement.id,
      });
    }

    setCurrentElement(null);
    brushEngineRef.current?.clear();
  }, [
    tool,
    isDrawing,
    currentElement,
    setElements,
    user,
    dragBox,
    handleSelectionEnd,
    transform.isTransforming,
    endTransform,
    selection.selectedIds,
    elements,
    getCanvasCoordinates,
    layerState.activeLayerId,
    socketRef,
    resolvedRoomIdRef,
  ]);

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

  const handleDeselect = useCallback(() => {
    // Release locks on all selected elements
    selection.selectedIds.forEach(id => {
      if (isLockedByMe(id)) {
        releaseLock(id);
      }
    });
    clearSelection();
  }, [selection.selectedIds, isLockedByMe, releaseLock, clearSelection]);

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

  /**
   * Handle keyboard events for tool selection and undo/redo
   * 
   * @effect
   * @dependencies undo, redo
   */
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Tool shortcuts
      const key = e.key.toLowerCase();
      switch (key) {
        case 'v':
          if (!e.ctrlKey && !e.metaKey) { // Only if not Ctrl+V
            setTool('select');
            e.preventDefault();
          }
          break;
        case 'p': setTool('pencil'); e.preventDefault(); break;
        case 'r': setTool('rectangle'); e.preventDefault(); break;
        case 'c': setTool('circle'); e.preventDefault(); break;
        case 'l': setTool('line'); e.preventDefault(); break;
        case 'a': setTool('arrow'); e.preventDefault(); break;
        case 't': setTool('text'); e.preventDefault(); break;
        case 'i': setTool('image'); e.preventDefault(); break;
        case 'e': setTool('eraser'); e.preventDefault(); break;
        case 'g': setShowGrid(prev => !prev); e.preventDefault(); break;
      }

      // Clipboard operations (with Ctrl/Cmd)
      if (e.ctrlKey || e.metaKey) {
        switch (key) {
          case 'c':
            e.preventDefault();
            copyToClipboard();
            break;
          case 'x':
            e.preventDefault();
            cutToClipboard();
            break;
          case 'v':
            e.preventDefault();
            // Get mouse position for paste location
            // You might want to pass the current cursor position here
            pasteFromClipboard(20, 20);
            break;
        }
      }

      // Selection operations
      if (selection.selectedIds.length > 0) {
        // Delete
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteSelected();
        }

        // Duplicate (Ctrl+D)
        if (e.ctrlKey && key === 'd') {
          e.preventDefault();
          duplicateSelected();
        }
      }

      // Undo/Redo
      if (e.ctrlKey && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey && key === 'y') || (e.ctrlKey && e.shiftKey && key === 'z')) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection.selectedIds, deleteSelected, duplicateSelected, undo, redo, copyToClipboard, cutToClipboard, pasteFromClipboard]);

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
            onClick={() => setTool('select')}
            className={`p-2 rounded-lg transition-colors ${tool === 'select'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            aria-label="Select tool"
            title="Select Tool (V)"
            aria-pressed={tool === 'select'}
          >
            <Move size={20} />
          </button>
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
            onClick={() => setTool('line')}
            className={`p-2 rounded-lg transition-colors ${tool === 'line'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            aria-label="Line tool"
            title="Line Tool (L)"
          >
            <Minus size={20} />
          </button>
          <button
            onClick={() => setTool('arrow')}
            className={`p-2 rounded-lg transition-colors ${tool === 'arrow'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            aria-label="Arrow tool"
            title="Arrow Tool (A)"
          >
            <ArrowRight size={20} />
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
          <button
            onClick={() => setTool('text')}
            className={`p-2 rounded-lg transition-colors ${tool === 'text'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            aria-label="Text tool"
            title="Text Tool (T)"
            aria-pressed={tool === 'text'}
          >
            <Type size={20} />
          </button>
          <button
            onClick={() => {
              if (tool === 'image') {
                // If already in image mode, trigger upload
                setIsUploadingImage(true);
              } else {
                setTool('image');
              }
            }}
            className={`p-2 rounded-lg transition-colors ${tool === 'image'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            aria-label="Insert image"
            title="Insert Image (I)"
          >
            <ImageIcon size={20} />
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
            if (socketRef.current && resolvedRoomIdRef.current) {
              if (isConnected) {
                socketRef.current.emit("clear-canvas", { roomId: resolvedRoomIdRef.current });
              } else {
                queueAction('clear-canvas', { roomId: resolvedRoomIdRef.current });
              }
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
      {/* Layer Panel */}
      <LayerPanel
        layers={layerState.layers}
        activeLayerId={layerState.activeLayerId}
        isExpanded={layerState.isExpanded}
        panelWidth={layerState.panelWidth}
        onToggleExpand={() => setLayerState(prev => ({ ...prev, isExpanded: !prev.isExpanded }))}
        onResize={(width) => setLayerState(prev => ({ ...prev, panelWidth: width }))}
        onCreateLayer={() => createLayer()}
        onDeleteLayer={deleteLayer}
        onDuplicateLayer={duplicateLayer}
        onToggleVisibility={toggleLayerVisibility}
        onToggleLock={toggleLayerLock}
        onSelectLayer={setActiveLayer}
        onRenameLayer={renameLayer}
        onMergeDown={mergeLayerDown}
        onReorderLayers={reorderLayers}
        totalElements={elements.length}
      />

      {/* Selection toolbar - shown when objects are selected */}
      {selection.selectedIds.length > 0 && (() => {
        const singleSelectedId =
          selection.selectedIds.length === 1
            ? selection.selectedIds[0]
            : null;

        const isLockedByOther =
          singleSelectedId &&
          isLocked(singleSelectedId) &&
          !isLockedByMe(singleSelectedId);

        return (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 z-20">

            {/* Lock indicator */}
            {singleSelectedId && isLockedByOther && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs">
                <Lock size={14} />
                <span>
                  Locked by {getLockInfo(singleSelectedId)?.username}
                </span>
              </div>
            )}

            {/* Copy */}
            <button
              onClick={copyToClipboard}
              disabled={!!isLockedByOther}
              className={`p-2 rounded-lg transition-colors ${isLockedByOther
                ? "opacity-50 cursor-not-allowed"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              title="Copy (Ctrl+C)"
            >
              <Copy size={18} />
            </button>

            {/* Cut */}
            <button
              onClick={cutToClipboard}
              disabled={!!isLockedByOther}
              className={`p-2 rounded-lg transition-colors ${isLockedByOther
                ? "opacity-50 cursor-not-allowed"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              title="Cut (Ctrl+X)"
            >
              <Scissors size={18} />
            </button>

            {/* Paste */}
            {hasClipboardContent() && (
              <button
                onClick={() => pasteFromClipboard(20, 20)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Paste (Ctrl+V)"
              >
                <Clipboard size={18} />
              </button>
            )}

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

            {/* Duplicate */}
            <button
              onClick={duplicateSelected}
              disabled={!!isLockedByOther}
              className={`p-2 rounded-lg transition-colors ${isLockedByOther
                ? "opacity-50 cursor-not-allowed"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              title="Duplicate (Ctrl+D)"
            >
              <Copy size={18} />
            </button>

            {/* Delete */}
            <button
              onClick={deleteSelected}
              disabled={!!isLockedByOther}
              className={`p-2 rounded-lg transition-colors ${isLockedByOther
                ? "opacity-50 cursor-not-allowed"
                : "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                }`}
              title="Delete (Del)"
            >
              <Trash size={18} />
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

            {/* Layer order */}
            <button
              onClick={bringToFront}
              disabled={!!isLockedByOther}
              className={`p-2 rounded-lg transition-colors ${isLockedByOther
                ? "opacity-50 cursor-not-allowed"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              title="Bring to Front"
            >
              <ArrowUp size={18} />
            </button>

            <button
              onClick={sendToBack}
              disabled={!!isLockedByOther}
              className={`p-2 rounded-lg transition-colors ${isLockedByOther
                ? "opacity-50 cursor-not-allowed"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              title="Send to Back"
            >
              <ArrowDown size={18} />
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

            {/* Selection count */}
            <span className="text-sm text-slate-600 dark:text-slate-400 px-2">
              {selection.selectedIds.length}{" "}
              {selection.selectedIds.length === 1 ? "object" : "objects"} selected
            </span>

            {/* Deselect */}
            <button
              onClick={handleDeselect}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Deselect (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        );
      })()}

      {/* Canvas info overlay */}
      <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-400">
        {Math.round(canvasSize.width)} × {Math.round(canvasSize.height)} px
        {brushConfig.pressureSensitive && " • Pressure: On"}
        {brushConfig.smoothing > 0 && ` • Smoothing: ${brushConfig.smoothing.toFixed(1)}`}
        {layerState.activeLayerId && (
          <span className="ml-2 inline-flex items-center gap-1">
            • Layer: {
              layerState.layers.find(l => l.id === layerState.activeLayerId)?.name
            }
            {!isLayerEditable(layerState.activeLayerId) && (
              <span className="text-xs text-amber-500">(locked)</span>
            )}
          </span>
        )}
      </div>

      {/* Network Status Indicator */}
      <NetworkStatus
        isOnline={isOnline}
        isConnected={isConnected}
        latency={latency}
        packetLoss={packetLoss}
        queueLength={actionQueue.length}
        isSyncing={isSyncing}
        onRetry={() => {
          if (socketRef.current && !isConnected) {
            socketRef.current.connect();
          }
        }}
        onSync={processQueue}
      />

      {/* Main drawing canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        className={`absolute top-0 left-0 w-full h-full bg-white dark:bg-slate-900 ${tool === 'select' ? 'cursor-default' : 'cursor-crosshair'
          }`}
        aria-label="Collaborative drawing canvas"
        title="Drawing area - Click and drag to draw"
      />

      {/* Selection drag box */}
      {dragBox && tool === 'select' && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-40"
          style={{
            left: `${Math.min(
              (dragBox.start.x / (window.devicePixelRatio || 1)) * zoomLevel + panOffset.x * zoomLevel,
              (dragBox.end.x / (window.devicePixelRatio || 1)) * zoomLevel + panOffset.x * zoomLevel
            )}px`,
            top: `${Math.min(
              (dragBox.start.y / (window.devicePixelRatio || 1)) * zoomLevel + panOffset.y * zoomLevel,
              (dragBox.end.y / (window.devicePixelRatio || 1)) * zoomLevel + panOffset.y * zoomLevel
            )}px`,
            width: `${Math.abs(dragBox.end.x - dragBox.start.x) / (window.devicePixelRatio || 1) * zoomLevel}px`,
            height: `${Math.abs(dragBox.end.y - dragBox.start.y) / (window.devicePixelRatio || 1) * zoomLevel}px`,
          }}
        />
      )}

      {/* Remote Cursors Overlay */}
      {Object.entries(remoteCursors).map(([id, pos]) => {
        // Don't show current user's cursor
        if (id === (user?.id || user?._id)) return null;

        const ToolIcon = getToolIcon(pos.tool || 'select');
        const toolColor = pos.color || getToolColor(pos.tool || 'select');

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
            {/* Custom cursor SVG with user's color */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill={toolColor} stroke="white" />
            </svg>

            {/* Tooltip with username and tool */}
            <div
              className="ml-3 px-2 py-1 rounded shadow-sm whitespace-nowrap flex items-center gap-1.5"
              style={{ backgroundColor: toolColor }}
            >
              <ToolIcon size={12} className="text-white" />
              <span className="text-white text-[10px] font-medium">
                {pos.username}
              </span>
              <span className="text-white/80 text-[8px]">
                {getToolLabel(pos.tool || 'select')}
              </span>
            </div>
          </div>
        );
      })}

      {/* Text Editor Overlay */}
      {isEditingText && textPosition && (
        <TextEditor
          initialText=""
          initialFormat={defaultTextFormat}
          position={{
            x: textPosition.x / (window.devicePixelRatio || 1) * zoomLevel + panOffset.x * zoomLevel,
            y: textPosition.y / (window.devicePixelRatio || 1) * zoomLevel + panOffset.y * zoomLevel
          }}
          onSave={handleTextSave}
          onCancel={() => {
            setIsEditingText(false);
            setTextPosition(null);
          }}
        />
      )}

      {/* For editing existing text (to be implemented later) */}
      {editingTextElement && (
        <TextEditor
          initialText={editingTextElement.text}
          initialFormat={editingTextElement.format}
          position={{
            x: editingTextElement.x! / (window.devicePixelRatio || 1) * zoomLevel + panOffset.x * zoomLevel,
            y: editingTextElement.y! / (window.devicePixelRatio || 1) * zoomLevel + panOffset.y * zoomLevel
          }}
          onSave={(text, format) => {
            // Update existing text element
            const updatedElement = {
              ...editingTextElement,
              text,
              format
            };

            setElements(elements.map(el =>
              el.id === editingTextElement.id ? updatedElement : el
            ));

            if (socketRef.current && resolvedRoomIdRef.current) {
              socketRef.current.emit("drawing-update", {
                roomId: resolvedRoomIdRef.current,
                element: updatedElement,
                saveToDb: true,
              });
            }

            setEditingTextElement(null);
          }}
          onCancel={() => setEditingTextElement(null)}
        />
      )}

      {/* Image Upload Modal */}
      {isUploadingImage && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={() => {
            setIsUploadingImage(false);
            setImagePosition(null);
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ImageUploader
              onImageUpload={handleImageUpload}
              onCancel={() => {
                setIsUploadingImage(false);
                setImagePosition(null);
              }}
              maxFileSize={10 * 1024 * 1024} // 10MB
            />
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCopy={copyToClipboard}
          onCut={cutToClipboard}
          onPaste={() => pasteFromClipboard(20, 20)}
          onDelete={deleteSelected}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          hasSelection={selection.selectedIds.length > 0}
          hasClipboard={hasClipboardContent()}
        />
      )}
    </div>
  );
};