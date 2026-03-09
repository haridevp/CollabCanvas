import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, RotateCw, ZoomIn, ZoomOut, Check, X } from 'lucide-react';

/**
 * Interface defining the properties for the ImageCropper component
 */
interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
  circularCrop?: boolean;
}

/**
 * ImageCropper Component
 *
 * A modal image cropping tool that allows users to crop, zoom, rotate, and adjust images
 * with real-time preview. Supports both circular and rectangular cropping.
 */
const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
  circularCrop = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Image transform state
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Interaction state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState<number>(200);

  // Track whether the image has loaded its natural dimensions
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  /**
   * When the image loads in the DOM, capture its natural dimensions
   * and compute initial scale + centered position.
   */
  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setNaturalSize({ w: nw, h: nh });

    const containerRect = container.getBoundingClientRect();
    const cw = containerRect.width;
    const ch = containerRect.height;

    // Set the crop size to fit nicely inside the container
    const desiredCrop = Math.min(cw, ch) * 0.6;
    const clampedCrop = Math.max(100, Math.min(desiredCrop, 400));
    setCropSize(Math.round(clampedCrop));

    // Scale so the image fills at least the crop area
    const initialScale = Math.max(clampedCrop / nw, clampedCrop / nh) * 1.2;
    setScale(initialScale);

    // Center the image so the crop area lands in the middle of the image
    const scaledW = nw * initialScale;
    const scaledH = nh * initialScale;
    setPosition({
      x: (cw - scaledW) / 2,
      y: (ch - scaledH) / 2
    });

    setImageLoaded(true);
  }, []);

  /**
   * Live preview: redraw the canvas whenever position, scale, cropSize, or rotation changes.
   */
  useEffect(() => {
    if (!imageLoaded) return;
    updatePreview();
  }, [position, scale, cropSize, rotation, imageLoaded]);

  /**
   * Renders the current crop area onto the preview canvas.
   */
  const updatePreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to desired output size
    const outputSize = 256; // High-res preview
    canvas.width = outputSize;
    canvas.height = outputSize;
    ctx.clearRect(0, 0, outputSize, outputSize);

    // Apply circular clip if needed
    if (circularCrop) {
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    const containerRect = container.getBoundingClientRect();
    const cw = containerRect.width;
    const ch = containerRect.height;

    // The crop overlay is centered in the container
    const cropLeft = (cw - cropSize) / 2;
    const cropTop = (ch - cropSize) / 2;

    // Convert crop area screen coordinates to source image coordinates
    // position.x/y is where the scaled image's top-left is relative to the container
    const sourceX = (cropLeft - position.x) / scale;
    const sourceY = (cropTop - position.y) / scale;
    const sourceW = cropSize / scale;
    const sourceH = cropSize / scale;

    // Handle rotation
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-outputSize / 2, -outputSize / 2);
    }

    ctx.drawImage(
      img,
      sourceX, sourceY, sourceW, sourceH,
      0, 0, outputSize, outputSize
    );

    if (rotation !== 0) {
      ctx.restore();
    }
  }, [position, scale, cropSize, rotation, circularCrop, imageLoaded]);

  // ─── Drag Handlers ───

  const handleMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent): void => {
    if (!isDragging) return;

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const cw = containerRect.width;
    const ch = containerRect.height;

    const scaledW = naturalSize.w * scale;
    const scaledH = naturalSize.h * scale;

    // The crop overlay center
    const cropLeft = (cw - cropSize) / 2;
    const cropTop = (ch - cropSize) / 2;

    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;

    // Constrain so the image always covers the crop area
    // Image left edge must be <= crop area left edge
    const maxX = cropLeft;
    // Image right edge must be >= crop area right edge
    const minX = cropLeft + cropSize - scaledW;

    const maxY = cropTop;
    const minY = cropTop + cropSize - scaledH;

    newX = Math.min(maxX, Math.max(minX, newX));
    newY = Math.min(maxY, Math.max(minY, newY));

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = (): void => {
    setIsDragging(false);
  };

  // ─── Zoom Handlers ───

  const adjustPositionAfterZoom = (oldScale: number, newScale: number) => {
    // Keep the crop area centered on the same image point after zooming
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const cw = containerRect.width;
    const ch = containerRect.height;

    // Center of crop area in container coordinates
    const cropCenterX = cw / 2;
    const cropCenterY = ch / 2;

    // What image point is currently at crop center?
    const imgPointX = (cropCenterX - position.x) / oldScale;
    const imgPointY = (cropCenterY - position.y) / oldScale;

    // After zoom, where should position be so that same image point stays at crop center?
    const newX = cropCenterX - imgPointX * newScale;
    const newY = cropCenterY - imgPointY * newScale;

    // Constrain
    const scaledW = naturalSize.w * newScale;
    const scaledH = naturalSize.h * newScale;
    const cropLeft = (cw - cropSize) / 2;
    const cropTop = (ch - cropSize) / 2;

    const clampedX = Math.min(cropLeft, Math.max(cropLeft + cropSize - scaledW, newX));
    const clampedY = Math.min(cropTop, Math.max(cropTop + cropSize - scaledH, newY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handleZoomIn = (): void => {
    const oldScale = scale;
    const newScale = Math.min(oldScale + 0.1, 3);
    setScale(newScale);
    adjustPositionAfterZoom(oldScale, newScale);
  };

  const handleZoomOut = (): void => {
    const oldScale = scale;
    // Don't allow zooming out so far that the image is smaller than the crop area
    const minScale = Math.max(cropSize / naturalSize.w, cropSize / naturalSize.h);
    const newScale = Math.max(oldScale - 0.1, minScale, 0.1);
    setScale(newScale);
    adjustPositionAfterZoom(oldScale, newScale);
  };

  const handleRotate = (): void => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleCropSizeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newCropSize = parseInt(e.target.value);
    setCropSize(newCropSize);

    // Ensure minimum scale still covers the new crop size
    const minScale = Math.max(newCropSize / naturalSize.w, newCropSize / naturalSize.h);
    if (scale < minScale) {
      setScale(minScale);
    }
  };

  // ─── Final Crop ───

  const handleCrop = (): void => {
    if (!canvasRef.current) return;

    // The preview canvas already has the cropped image rendered
    const croppedImageUrl = canvasRef.current.toDataURL('image/png');
    onCropComplete(croppedImageUrl);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-label="Image cropper"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Crop className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Crop Profile Picture
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Close cropper"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Main content */}
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left column: Crop area */}
            <div className="flex-1">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Crop Size
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="100"
                    max="400"
                    value={cropSize}
                    onChange={handleCropSizeChange}
                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    aria-label="Adjust crop size"
                    aria-valuemin={100}
                    aria-valuemax={400}
                    aria-valuenow={cropSize}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[60px]">
                    {cropSize}px
                  </span>
                </div>
              </div>

              {/* Interactive crop area */}
              <div
                ref={containerRef}
                className="relative w-full h-96 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                role="region"
                aria-label="Crop area. Drag to position the image."
              >
                {/* Draggable image */}
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Image to crop"
                  className="absolute max-w-none pointer-events-none"
                  style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${naturalSize.w * scale}px`,
                    height: `${naturalSize.h * scale}px`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    pointerEvents: 'none',
                  }}
                  onLoad={handleImageLoad}
                  draggable={false}
                />

                {/* Crop overlay mask */}
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    width: `${cropSize}px`,
                    height: `${cropSize}px`,
                    border: '2px dashed white',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    borderRadius: circularCrop ? '50%' : '8px'
                  }}
                  aria-label="Crop boundary"
                />

                {/* Make the whole container grabbable */}
                <div
                  className="absolute inset-0"
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                />
              </div>
            </div>

            {/* Right column: Controls and preview */}
            <div className="lg:w-80 space-y-6">
              {/* Image adjustment controls */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <h4 className="font-medium text-slate-800 dark:text-white mb-4">
                  Adjust Image
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleZoomIn}
                    className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                    <span className="text-sm">Zoom In</span>
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                    <span className="text-sm">Zoom Out</span>
                  </button>
                  <button
                    onClick={handleRotate}
                    className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    aria-label="Rotate 90 degrees"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span className="text-sm">Rotate 90°</span>
                  </button>
                  <div className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="text-center">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Scale</div>
                      <div className="font-medium text-slate-800 dark:text-white">
                        {Math.round(scale * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cropped image preview */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <h4 className="font-medium text-slate-800 dark:text-white mb-4">
                  Preview
                </h4>
                <div className="flex flex-col items-center">
                  <div
                    className="w-32 h-32 border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden bg-white dark:bg-slate-700"
                    style={{
                      borderRadius: circularCrop ? '50%' : '16px'
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full"
                      aria-label="Cropped image preview"
                    />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 text-center">
                    {circularCrop ? 'Circular profile picture' : 'Square profile picture'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cancel cropping"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            aria-label="Apply crop"
          >
            <Check className="w-4 h-4" />
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;