import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';

/**
 * Props for the ImageUploader component
 * 
 * @interface ImageUploaderProps
 */
interface ImageUploaderProps {
    /** Callback when image is uploaded and processed */
    onImageUpload: (imageData: { src: string; width: number; height: number }) => void;
    /** Callback when upload is cancelled */
    onCancel: () => void;
    /** Maximum file size in bytes (default: 5MB) */
    maxFileSize?: number;
    /** Allowed image types */
    allowedTypes?: string[];
}

/**
 * ImageUploader Component
 * 
 * @component
 * @description
 * A component for uploading and previewing images before inserting them onto the canvas.
 * Supports drag-and-drop, file selection, and URL input.
 * 
 * @example
 * ```tsx
 * <ImageUploader
 *   onImageUpload={(imageData) => addImageToCanvas(imageData)}
 *   onCancel={() => setShowImageUploader(false)}
 *   maxFileSize={10 * 1024 * 1024} // 10MB
 * />
 * ```
 */
const ImageUploader: React.FC<ImageUploaderProps> = ({
    onImageUpload,
    onCancel,
    maxFileSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
}) => {
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');

    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * Validate file type and size
     */
    const validateFile = (file: File): boolean => {
        // Check file type
        if (!allowedTypes.includes(file.type)) {
            setError(`File type not supported. Please use: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`);
            return false;
        }

        // Check file size
        if (file.size > maxFileSize) {
            setError(`File too large. Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB`);
            return false;
        }

        return true;
    };

    /**
     * Process uploaded file
     */
    const processFile = (file: File): void => {
        setError(null);
        setIsLoading(true);

        if (!validateFile(file)) {
            setIsLoading(false);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setPreviewUrl(result);

            // Create an image to get dimensions
            const img = new Image();
            img.onload = () => {
                onImageUpload({
                    src: result,
                    width: img.width,
                    height: img.height
                });
                setIsLoading(false);
            };
            img.onerror = () => {
                setError('Failed to load image');
                setIsLoading(false);
            };
            img.src = result;
        };
        reader.onerror = () => {
            setError('Failed to read file');
            setIsLoading(false);
        };
        reader.readAsDataURL(file);
    };

    /**
     * Handle file selection
     */
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    /**
     * Handle drag events
     */
    const handleDragOver = (e: React.DragEvent): void => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent): void => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent): void => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    };

    /**
     * Handle URL submission
     */
    const handleUrlSubmit = async (): Promise<void> => {
        if (!urlInput) return;

        setError(null);
        setIsLoading(true);

        try {
            // Validate URL
            new URL(urlInput);

            // For external URLs, we need to handle CORS
            // Option 1: Use a proxy service
            // Option 2: Fetch and convert to data URL
            try {
                const response = await fetch(urlInput, {
                    mode: 'cors',
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    }
                });
                const blob = await response.blob();
                const reader = new FileReader();

                reader.onload = (e) => {
                    const result = e.target?.result as string;

                    const img = new Image();
                    img.onload = () => {
                        onImageUpload({
                            src: result,
                            width: img.width,
                            height: img.height
                        });
                        setIsLoading(false);
                    };
                    img.onerror = () => {
                        setError('Failed to load image from URL');
                        setIsLoading(false);
                    };
                    img.src = result;
                };
                reader.readAsDataURL(blob);
            } catch (error) {
                // If fetch fails, try loading directly (may have CORS issues)
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    // Create canvas to convert to data URL
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');

                    onImageUpload({
                        src: dataUrl,
                        width: img.width,
                        height: img.height
                    });
                    setIsLoading(false);
                };
                img.onerror = () => {
                    setError('Failed to load image from URL (CORS issue). Try downloading and uploading instead.');
                    setIsLoading(false);
                };
                img.src = urlInput;
            }
        } catch (error) {
            setError('Invalid URL');
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-96">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Insert Image
                    </h3>
                </div>
                <button
                    onClick={onCancel}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <X size={20} className="text-slate-500" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'upload'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    Upload File
                </button>
                <button
                    onClick={() => setActiveTab('url')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'url'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    From URL
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                {activeTab === 'upload' ? (
                    <>
                        {/* Drag and drop area */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={allowedTypes.join(',')}
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {isLoading ? (
                                <Loader className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-spin" />
                            ) : (
                                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            )}

                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {isLoading ? 'Processing...' : 'Click or drag image to upload'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Supported: PNG, JPG, GIF, WebP, SVG (max {Math.round(maxFileSize / 1024 / 1024)}MB)
                            </p>
                        </div>

                        {/* Preview */}
                        {previewUrl && !isLoading && (
                            <div className="mt-4">
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Preview:
                                </p>
                                <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="max-w-full h-auto max-h-32 mx-auto"
                                    />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* URL Input */
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Image URL
                            </label>
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                               
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={handleUrlSubmit}
                            disabled={!urlInput || isLoading}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader size={16} className="animate-spin" />
                                    Loading...
                                </span>
                            ) : (
                                'Load Image'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageUploader;