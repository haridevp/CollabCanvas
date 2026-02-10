import React, { useRef, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../services/AuthContext";
import ColorPicker from "../../components/ui/ColorPicker";
import type { DrawingElement, Point, BrushConfig } from "../../types/canvas";
import BrushSettings from "../../components/ui/BrushSettings";
import type { BrushType, StrokeStyle } from "../../types/canvas";
import { exportDrawing } from "../../utils/authService";
import {
  Square,
  Circle,
  Edit2,
  Trash2,
  Grid,
  Minus,
  Plus,
  Eraser,
  MinusCircle,
  PlusCircle,
  Zap,
  ZapOff,
  Download,
} from "lucide-react";

/**
 * Brush engine for freehand drawing with smoothing and pressure simulation
 */
class BrushEngine {
  private points: Point[] = [];
  private smoothedPoints: Point[] = [];
  private smoothingFactor: number = 0.5;
  private pressure: number = 1;
  private lastWidth: number = 3;
  private config: BrushConfig;

  constructor(config: BrushConfig) {
    this.config = config;
  }

  /**
   * Add a new point to the brush stroke
   */
  addPoint(point: Point, pressure: number = 1) {
    this.points.push(point);
    this.pressure = pressure;

    // Apply smoothing algorithm
    this.applySmoothing();
  }

  /**
   * Apply smoothing to the points using moving average
   */
  private applySmoothing() {
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

      // Apply moving average kernel
      for (let j = -kernelSize; j <= kernelSize; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < this.points.length) {
          sumX += this.points[idx].x;
          sumY += this.points[idx].y;
          count++;
        }
      }

      smoothed.push({
        x: sumX / count,
        y: sumY / count,
      });
    }

    this.smoothedPoints = smoothed;
  }

  /**
   * Calculate stroke width based on pressure and velocity
   */
  calculateStrokeWidth(velocity: number): number {
    if (!this.config.pressureSensitive) {
      return (
        this.config.minWidth + (this.config.maxWidth - this.config.minWidth) / 2
      );
    }

    // Simulate pressure: slower movement = thicker stroke
    const pressureFactor = Math.max(0.1, Math.min(2, 1 / (velocity + 0.1)));
    const width =
      this.config.minWidth +
      (this.config.maxWidth - this.config.minWidth) *
        pressureFactor *
        this.pressure;

    // Smooth width transitions
    this.lastWidth = this.lastWidth * 0.7 + width * 0.3;
    return this.lastWidth;
  }

  /**
   * Get smoothed points for rendering
   */
  getPoints(): Point[] {
    return this.config.smoothing > 0 ? this.smoothedPoints : this.points;
  }

  /**
   * Clear all points
   */
  clear() {
    this.points = [];
    this.smoothedPoints = [];
  }

  /**
   * Check if we have enough points to draw
   */
  hasPoints(): boolean {
    return this.points.length > 1;
  }
}

/**
 * CollaborativeCanvas component - Interactive drawing canvas with enhanced brush engine
 */
export const CollaborativeCanvas = ({ roomId }: { roomId?: string }) => {
  const { user } = useAuth();
  // Canvas references
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(
    null,
  );
  const [tool, setTool] = useState<
    "pencil" | "rectangle" | "circle" | "eraser"
  >("pencil");
  const [lockedObjects, setLockedObjects] =
    useState <
    Record<string, { userId: string; username: string; color: string }>({});

  // Brush settings
  const [color, setColor] = useState("#2563eb");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [brushConfig, setBrushConfig] = useState<BrushConfig>({
    minWidth: 1,
    maxWidth: 10,
    pressureSensitive: true,
    smoothing: 0.7,
    antiAliasing: true,
  });

  // Canvas state
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, { x: number; y: number; username: string }>
  >({});
  const [isExporting, setIsExporting] = useState(false);

  // Brush engine instance
  const brushEngineRef = useRef<BrushEngine | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastEmitTimeRef = useRef<number>(0);

  // Initialize Socket connection
  useEffect(() => {
    if (!roomId || !user) return;

    const socketUrl =
      import.meta.env.VITE_API_URL?.replace("/api", "") ||
      "http://localhost:5000";
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.emit("join-room", { roomId, userId: user.id || user._id });

    socket.on("room-state", ({ drawingData }) => {
      if (drawingData) {
        setElements(drawingData);
      }
    });

    socket.on("drawing-update", (data) => {
      if (data.element) {
        setElements((prev) => {
          const exists = prev.find((el) => el.id === data.element.id);
          if (exists) {
            return prev.map((el) =>
              el.id === data.element.id ? data.element : el,
            );
          }
          return [...prev, data.element];
        });
      }
    });

    socket.on("canvas-cleared", () => {
      setElements([]);
    });

    socket.on("cursor-update", ({ userId, x, y, username }) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [userId]: { x, y, username: username || "User" },
      }));
    });

    socket.on("user-left", ({ userId }) => {
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    socket.on("object-locked", ({ elementId, userId, username, color }) => {
      setLockedObjects((prev) => ({
        ...prev,
        [elementId]: { userId, username, color },
      }));
    });

    socket.on("object-unlocked", ({ elementId }) => {
      setLockedObjects((prev) => {
        const next = { ...prev };
        delete next[elementId];
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, user]);

  // Initialize brush engine
  useEffect(() => {
    brushEngineRef.current = new BrushEngine(brushConfig);
  }, [brushConfig]);

  const [brushType, setBrushType] = useState<BrushType>("pencil");
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>({
    type: "solid",
    lineCap: "round",
    lineJoin: "round",
  });

  /**
   * Draw grid background
   */
  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (!showGrid) return;

      const gridSize = 20 * zoomLevel;
      ctx.strokeStyle = "rgba(229, 231, 235, 0.5)";
      ctx.lineWidth = 1;

      // Apply zoom transformation for grid
      ctx.save();
      ctx.translate(panOffset.x * zoomLevel, panOffset.y * zoomLevel);
      ctx.scale(zoomLevel, zoomLevel);

      // Vertical lines
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.restore();
    },
    [showGrid, zoomLevel, panOffset],
  );

  /**
   * Redraw all elements on canvas
   */
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);

    // Apply transformations for elements
    ctx.save();
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(1 / dpr, 1 / dpr);
    ctx.translate(panOffset.x * zoomLevel * dpr, panOffset.y * zoomLevel * dpr);
    ctx.scale(zoomLevel, zoomLevel);

    // Set anti-aliasing
    if (brushConfig.antiAliasing) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }

    // Draw all saved elements
    elements.forEach((el) => {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = el.opacity || 1;

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

        case "eraser":
          // Eraser is just a white pencil
          ctx.strokeStyle = "#ffffff";
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
   * Initialize and update canvas size
   */
  const updateCanvasSize = useCallback(() => {
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
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [updateCanvasSize]);

  /**
   * Convert mouse coordinates to canvas coordinates
   */
  const getCanvasCoordinates = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = ((clientX - rect.left) / zoomLevel - panOffset.x) * dpr;
    const y = ((clientY - rect.top) / zoomLevel - panOffset.y) * dpr;

    return { x, y };
  };

  /**
   * Calculate velocity between points
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
   * Start drawing operation
   */
  const startDrawing = useCallback(
    (e: React.MouseEvent) => {
      const point = getCanvasCoordinates(e.clientX, e.clientY);
      setIsDrawing(true);
      lastPointRef.current = point;
      lastTimeRef.current = Date.now();

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      const newElement: DrawingElement =
        tool === "pencil" || tool === "eraser"
          ? {
              id,
              type: tool,
              points: [point],
              color: tool === "eraser" ? "#ffffff" : color,
              strokeWidth,
              opacity,
            }
          : {
              id,
              type: tool,
              x: point.x,
              y: point.y,
              width: 0,
              height: 0,
              color,
              strokeWidth,
              opacity,
            };

      setCurrentElement(newElement);

      // Emit object lock event to other users
      if (socketRef.current && roomId && user) {
        socketRef.current.emit("lock-object", {
          roomId,
          elementId: id,
          userId: user.id || user._id,
          username: user.username || user.displayName,
          color: tool === "eraser" ? "#ffffff" : color,
        });
      }
    },
    [tool, color, strokeWidth, opacity, getCanvasCoordinates, roomId, user],
  );

  /**
   * Update drawing while mouse moves
   */
  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !currentElement) return;

    const { clientX, clientY } = e;
    const point = getCanvasCoordinates(clientX, clientY);

    // Emit cursor movement
    if (socketRef.current && roomId && user) {
      socketRef.current.emit("cursor-move", {
        roomId,
        x: point.x,
        y: point.y,
        userId: user.id || user._id,
        username: user.username || user.fullName,
      });
    }

    // eslint-disable-next-line react-hooks/purity
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

      // Add point with simulated pressure
      brushEngineRef.current.addPoint(point, pressure);

      // Update current element with brush engine points
      const updatedElement: DrawingElement = {
        ...currentElement,
        points: brushEngineRef.current.getPoints(),
        strokeWidth: brushEngineRef.current.calculateStrokeWidth(velocity),
      };

      setCurrentElement(updatedElement);
      redrawCurrentStroke(updatedElement);

      // Emit real-time update (throttled)
      if (
        socketRef.current &&
        roomId &&
        currentTime - lastEmitTimeRef.current > 50
      ) {
        socketRef.current.emit("drawing-update", {
          roomId,
          element: updatedElement,
          saveToDb: false,
        });
        lastEmitTimeRef.current = currentTime;
      }
    } else {
      // Update shape dimensions
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
   * Stop drawing and finalize element
   */
  const stopDrawing = () => {
    if (!isDrawing || !currentElement) return;

    setIsDrawing(false);

    // Only add to elements if it's a valid drawing
    if (tool === "pencil" || tool === "eraser") {
      if (brushEngineRef.current?.hasPoints()) {
        setElements((prev) => [...prev, currentElement]);
        if (socketRef.current && roomId) {
          socketRef.current.emit("drawing-update", {
            roomId,
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
        setElements((prev) => [...prev, currentElement]);
        if (socketRef.current && roomId) {
          socketRef.current.emit("drawing-update", {
            roomId,
            element: currentElement,
            saveToDb: true,
          });
        }
      }
    }

    // Emit object unlock event
    if (socketRef.current && roomId && currentElement) {
      socketRef.current.emit("unlock-object", {
        roomId,
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
   */
  const redrawCurrentStroke = (element: DrawingElement) => {
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

  // Redraw when dependencies change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  /**
   * Handle zoom controls
   */
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () =>
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  /**
   * Handle brush settings changes
   */
  const updateBrushConfig = (updates: Partial<BrushConfig>) => {
    setBrushConfig((prev) => ({ ...prev, ...updates }));
  };

  /**
   * Handle export drawing
   */
  const handleExport = async (format: 'png' | 'jpeg' = 'png') => {
    if (!roomId) {
      alert('Room ID is required for export');
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportDrawing(roomId, format);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `drawing_${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export drawing');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-100 overflow-hidden"
    >
      {/* Enhanced toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-4 z-10">
        {/* Drawing tools */}
        <div className="flex border-r border-slate-200 pr-4 gap-1">
          <button
            onClick={() => setTool("pencil")}
            className={`p-2 rounded-lg transition-colors ${tool === "pencil" ? "bg-blue-100 text-blue-600" : "text-slate-600 hover:bg-slate-100"}`}
            aria-label="Pencil tool"
            title="Pencil Tool"
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={() => setTool("rectangle")}
            className={`p-2 rounded-lg transition-colors ${tool === "rectangle" ? "bg-blue-100 text-blue-600" : "text-slate-600 hover:bg-slate-100"}`}
            aria-label="Rectangle tool"
            title="Rectangle Tool"
          >
            <Square size={20} />
          </button>
          <button
            onClick={() => setTool("circle")}
            className={`p-2 rounded-lg transition-colors ${tool === "circle" ? "bg-blue-100 text-blue-600" : "text-slate-600 hover:bg-slate-100"}`}
            aria-label="Circle tool"
            title="Circle Tool"
          >
            <Circle size={20} />
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`p-2 rounded-lg transition-colors ${tool === "eraser" ? "bg-blue-100 text-blue-600" : "text-slate-600 hover:bg-slate-100"}`}
            aria-label="Eraser tool"
            title="Eraser Tool"
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
          className="border-r border-slate-200 pr-4"
        />

        {/* Stroke width control */}
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
          className="border-r border-slate-200 pr-4"
        />

        {/* Brush settings */}
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
          <div className="flex flex-col items-center">
            <button
              onClick={() =>
                updateBrushConfig({
                  pressureSensitive: !brushConfig.pressureSensitive,
                })
              }
              className={`p-1.5 rounded ${brushConfig.pressureSensitive ? "bg-blue-100 text-blue-600" : "text-slate-600"}`}
              aria-label={
                brushConfig.pressureSensitive
                  ? "Disable pressure sensitivity"
                  : "Enable pressure sensitivity"
              }
              title="Pressure Sensitivity"
            >
              {brushConfig.pressureSensitive ? (
                <Zap size={16} />
              ) : (
                <ZapOff size={16} />
              )}
            </button>
            <span className="text-xs text-slate-500">Pressure</span>
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
            <span className="text-xs text-slate-500">Smooth</span>
          </div>
        </div>

        {/* Canvas controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${showGrid ? "bg-blue-100 text-blue-600" : "text-slate-600 hover:bg-slate-100"}`}
            aria-label={showGrid ? "Hide grid" : "Show grid"}
            title="Toggle Grid"
          >
            <Grid size={20} />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
              aria-label="Zoom out"
              title="Zoom Out"
            >
              <Minus size={16} />
            </button>
            <span className="text-sm font-medium text-slate-700 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
              aria-label="Zoom in"
              title="Zoom In"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={handleResetZoom}
            className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
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
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm text-slate-600">
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
        className="absolute top-0 left-0 w-full h-full bg-white cursor-crosshair"
        aria-label="Collaborative drawing canvas"
        title="Drawing area - Click and drag to draw"
      />

      {/* Remote Cursors Overlay */}
      {Object.entries(remoteCursors).map(([id, pos]) => {
        if (id === (user?.id || user?._id)) return null;
        return (
          <div
            key={id}
            className="absolute pointer-events-none z-50 transition-all duration-75 ease-linear"
            style={{
              left: `${(pos.x / (window.devicePixelRatio || 1)) * zoomLevel + panOffset.x * zoomLevel}px`,
              top: `${(pos.y / (window.devicePixelRatio || 1)) * zoomLevel + panOffset.y * zoomLevel}px`,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill="#3B82F6"
                stroke="white"
              />
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
