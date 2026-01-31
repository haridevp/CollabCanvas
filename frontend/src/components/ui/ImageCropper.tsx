// src/components/ui/ImageCropper.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Crop, RotateCw, ZoomIn, ZoomOut, Check, X } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number; // width/height ratio, undefined for free crop
  circularCrop?: boolean;
}

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
  
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState(200);

  // Initialize image
  useEffect(() => {
    if (imageRef.current) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        // Set initial crop size based on image dimensions
        const minDimension = Math.min(img.width, img.height);
        setCropSize(Math.min(minDimension, 300));
        
        // Center the image
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          setPosition({
            x: (containerRect.width - img.width * scale) / 2,
            y: (containerRect.height - img.height * scale) / 2
          });
        }
      };
    }
  }, [imageSrc, scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Boundary checks
    if (containerRef.current && imageRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const imgWidth = imageRef.current.width * scale;
      const imgHeight = imageRef.current.height * scale;
      
      const maxX = containerRect.width - imgWidth;
      const maxY = containerRect.height - imgHeight;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleCropSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCropSize(parseInt(e.target.value));
  };

  const handleCrop = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to crop size
    canvas.width = cropSize;
    canvas.height = cropSize;

    // Clear canvas
    ctx.clearRect(0, 0, cropSize, cropSize);

    // Create circular mask if needed
    if (circularCrop) {
      ctx.beginPath();
      ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    // Calculate source coordinates for cropping
    const img = imageRef.current;
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (!containerRect) return;

    // Convert position relative to image
    const sourceX = -position.x / scale;
    const sourceY = -position.y / scale;
    const sourceWidth = cropSize / scale;
    const sourceHeight = cropSize / scale;

    // Draw cropped image
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle
      0, 0, cropSize, cropSize // Destination rectangle
    );

    // Get cropped image as data URL
    const croppedImageUrl = canvas.toDataURL('image/png');
    onCropComplete(croppedImageUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/80 dark:bg-black/90 flex items-center justify-center z-50 p-4">
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

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Crop area */}
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
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[60px]">
                    {cropSize}px
                  </span>
                </div>
              </div>

              <div
                ref={containerRef}
                className="relative w-full h-96 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-700"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Image container */}
                <div
                  className="absolute"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                >
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="To crop"
                    className="max-w-none"
                    style={{
                      width: 'auto',
                      height: 'auto',
                      display: 'block'
                    }}
                  />
                </div>

                {/* Crop overlay */}
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    width: `${cropSize}px`,
                    height: `${cropSize}px`,
                    border: '2px dashed white',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    borderRadius: circularCrop ? '50%' : '8px'
                  }}
                />
              </div>
            </div>

            {/* Controls and preview */}
            <div className="lg:w-80 space-y-6">
              {/* Controls */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <h4 className="font-medium text-slate-800 dark:text-white mb-4">
                  Adjust Image
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleZoomIn}
                    className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                    <span className="text-sm">Zoom In</span>
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                    <span className="text-sm">Zoom Out</span>
                  </button>
                  <button
                    onClick={handleRotate}
                    className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
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

              {/* Preview */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <h4 className="font-medium text-slate-800 dark:text-white mb-4">
                  Preview
                </h4>
                <div className="flex flex-col items-center">
                  <div
                    className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden bg-white dark:bg-slate-700"
                    style={{
                      borderRadius: circularCrop ? '50%' : '16px'
                    }}
                  >
                    <canvas ref={canvasRef} className="w-full h-full" />
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
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
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