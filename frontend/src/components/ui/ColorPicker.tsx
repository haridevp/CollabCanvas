import React, { useState, useRef, useEffect } from 'react';
import { Palette, Droplet, Check } from 'lucide-react';

/**
 * Interface defining the properties for the ColorPicker component
 * 
 * @interface ColorPickerProps
 * @property {string} value - Currently selected color in hex format (e.g., '#3b82f6')
 * @property {(color: string) => void} onChange - Callback when color changes
 * @property {number} [opacity=1] - Current opacity value (0 to 1)
 * @property {(opacity: number) => void} [onOpacityChange] - Callback when opacity changes
 * @property {string} [className=''] - Additional CSS classes for the container
 */
interface ColorPickerProps {
  /** Currently selected color in hex format (e.g., '#3b82f6') */
  value: string;
  /** Callback when color changes */
  onChange: (color: string) => void;
  /** Current opacity value (0 to 1) */
  opacity?: number;
  /** Callback when opacity changes */
  onOpacityChange?: (opacity: number) => void;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * ColorPicker Component
 * 
 * @component
 * @description
 * An advanced color picker component with HSL controls, opacity support, and color presets.
 * Features a visual color selector with hue, saturation, and lightness controls, along with
 * transparency/opacity management and quick color presets.
 * 
 * @features
 * - **Visual Color Selection**: HSL color space controls with interactive saturation/lightness grid
 * - **Opacity Control**: Optional transparency slider with visual feedback
 * - **Color Presets**: Quick-select common colors
 * - **Multiple Input Methods**: HSL sliders, hex input, opacity percentage
 * - **Visual Feedback**: Live preview with checkerboard transparency pattern
 * - **Accessibility**: Proper ARIA labels and keyboard navigation
 * 
 * @example
 * ```tsx
 * // Basic color picker
 * <ColorPicker 
 *   value={color}
 *   onChange={(newColor) => setColor(newColor)}
 * />
 * 
 * // Color picker with opacity
 * <ColorPicker 
 *   value={color}
 *   onChange={setColor}
 *   opacity={opacity}
 *   onOpacityChange={setOpacity}
 * />
 * 
 * // With custom styling
 * <ColorPicker 
 *   value={color}
 *   onChange={setColor}
 *   className="w-full"
 * />
 * ```
 * 
 * @param {ColorPickerProps} props - Component properties
 * @param {string} props.value - Currently selected color
 * @param {(color: string) => void} props.onChange - Color change handler
 * @param {number} [props.opacity=1] - Current opacity (0-1)
 * @param {(opacity: number) => void} [props.onOpacityChange] - Opacity change handler
 * @param {string} [props.className=''] - Additional CSS classes
 * 
 * @returns {JSX.Element} Color picker UI with dropdown controls
 */
const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  opacity = 1,
  onOpacityChange,
  className = ''
}) => {
  // State for dropdown visibility
  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  // State for HSL color values
  const [hue, setHue] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(100);
  const [lightness, setLightness] = useState<number>(50);
  
  // State for alpha (opacity) value
  const [alpha, setAlpha] = useState<number>(opacity);
  
  // Ref for detecting clicks outside the component
  const pickerRef = useRef<HTMLDivElement>(null);

  /**
   * Array of common color presets for quick selection
   * 
   * @constant {string[]} colorPresets
   * @description Predefined hex color values including primary colors, grayscale, and additional colors
   */
  const colorPresets: string[] = [
    // Primary colors
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    
    // Grayscale
    '#000000', // Black
    '#374151', // Gray-700
    '#6b7280', // Gray-500
    '#d1d5db', // Gray-300
    '#ffffff', // White
    
    // Additional colors
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#f43f5e', // Rose
  ];

  /**
   * Convert HSL color values to hex format
   * 
   * @function hslToHex
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {string} Hex color string (e.g., '#ff0000')
   * 
   * @remarks
   * Uses HSL to RGB conversion formula and then converts RGB to hex
   */
  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  /**
   * Convert hex color string to HSL values
   * 
   * @function hexToHsl
   * @param {string} hex - Hex color string (e.g., '#ff0000')
   * @returns {{ h: number, s: number, l: number }} Object containing HSL values
   * 
   * @remarks
   * Converts hex to RGB first, then RGB to HSL using color space conversion formulas
   */
  const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex values to RGB (0-1 range)
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    // Find min/max for HSL calculation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
    // Calculate hue and saturation if not grayscale
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      // Calculate hue based on which color is dominant
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return {
      h: Math.round(h * 360),    // Convert to degrees (0-360)
      s: Math.round(s * 100),    // Convert to percentage (0-100)
      l: Math.round(l * 100)     // Convert to percentage (0-100)
    };
  };

  /**
   * Initialize HSL values from current color value
   * Runs when component mounts or color value changes
   */
  useEffect(() => {
    const hsl = hexToHsl(value);
    setHue(prev => (prev === hsl.h ? prev : hsl.h));
    setSaturation(prev => (prev === hsl.s ? prev : hsl.s));
    setLightness(prev => (prev === hsl.l ? prev : hsl.l));
  }, [value]);

  /**
   * Handle color change from HSL values
   * 
   * @function handleHslChange
   * @param {number} h - New hue value
   * @param {number} s - New saturation value
   * @param {number} l - New lightness value
   */
  const handleHslChange = (h: number, s: number, l: number): void => {
    const hex = hslToHex(h, s, l);
    onChange(hex);
  };

  /**
   * Handle clicks outside the color picker to close it
   */
  useEffect(() => {
    /**
     * Event handler for detecting clicks outside the component
     * 
     * @param {MouseEvent} event - Mouse event
     */
    const handleClickOutside = (event: MouseEvent): void => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Add event listener when picker is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Handle opacity/alpha value changes
   * 
   * @function handleOpacityChange
   * @param {number} newOpacity - New opacity value (0-1)
   */
  const handleOpacityChange = (newOpacity: number): void => {
    setAlpha(newOpacity);
    if (onOpacityChange) {
      onOpacityChange(newOpacity);
    }
  };

  /**
   * Current color with opacity applied as hex with alpha channel
   * 
   * @constant {string} currentColorWithOpacity
   * @description Hex color with alpha channel (e.g., '#3b82f680')
   */
  const currentColorWithOpacity: string = value + Math.round(alpha * 255).toString(16).padStart(2, '0');

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      {/* Color preview button - Toggles the color picker dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        aria-label="Open color picker"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <div className="relative">
          {/* Checkerboard background for transparency visualization */}
          <div 
            className="w-6 h-6 rounded border border-slate-300 dark:border-slate-600"
            style={{ 
              backgroundColor: value,
              backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
            }}
          />
          {/* Color overlay with current opacity */}
          <div 
            className="absolute inset-0 rounded border border-slate-300 dark:border-slate-600"
            style={{ 
              backgroundColor: currentColorWithOpacity,
            }}
          />
        </div>
        {/* Palette icon */}
        <Palette className="w-4 h-4 text-slate-500" />
      </button>

      {/* Color picker dropdown - Appears when isOpen is true */}
      {isOpen && (
        <div 
          className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 z-50"
          role="dialog"
          aria-label="Color picker"
          aria-modal="true"
        >
          {/* Current color preview section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Selected Color
              </span>
              <div className="flex items-center gap-2">
                {/* Hex value display */}
                <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  {value.toUpperCase()}
                </code>
                {/* Opacity percentage display (if enabled) */}
                {onOpacityChange && (
                  <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {Math.round(alpha * 100)}%
                  </code>
                )}
              </div>
            </div>
            {/* Large color preview with checkerboard background */}
            <div className="relative h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              {/* Checkerboard pattern for transparency visualization */}
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px'
                }}
              />
              {/* Current color with opacity overlay */}
              <div 
                className="absolute inset-0"
                style={{ backgroundColor: currentColorWithOpacity }}
              />
            </div>
          </div>

          {/* Color presets section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Quick Colors
              </span>
              <Droplet className="w-4 h-4 text-slate-400" />
            </div>
            {/* Grid of color preset buttons */}
            <div className="grid grid-cols-6 gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onChange(preset);
                    const hsl = hexToHsl(preset);
                    setHue(hsl.h);
                    setSaturation(hsl.s);
                    setLightness(hsl.l);
                  }}
                  className="relative w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform"
                  style={{ backgroundColor: preset }}
                  aria-label={`Select color ${preset}`}
                  aria-pressed={value === preset}
                >
                  {/* Checkmark indicator for selected color */}
                  {value === preset && (
                    <Check className="absolute inset-0 m-auto w-4 h-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Hue slider section */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-600 dark:text-slate-400">Hue</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                {hue}°
              </span>
            </div>
            {/* Visual hue spectrum slider */}
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={(e) => {
                const newHue = parseInt(e.target.value);
                setHue(newHue);
                handleHslChange(newHue, saturation, lightness);
              }}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
              }}
              aria-label="Adjust hue"
              aria-valuenow={hue}
              aria-valuemin={0}
              aria-valuemax={360}
            />
          </div>

          {/* Saturation and Lightness grid section */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Saturation & Lightness
              </span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                S:{saturation}% L:{lightness}%
              </span>
            </div>
            {/* Interactive saturation/lightness grid */}
            <div className="relative h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              {/* Saturation gradient (horizontal) */}
              <div 
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, hsl(${hue}, 100%, 50%), hsl(${hue}, 0%, 50%))`
                }}
              />
              {/* Lightness gradient (vertical) */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0))'
                }}
              />
              {/* Selection indicator */}
              <div 
                className="absolute w-3 h-3 rounded-full border-2 border-white shadow-lg"
                style={{
                  left: `${saturation}%`,
                  top: `${100 - lightness}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
              {/* Mouse interaction */}
              <div
                className="absolute inset-0 cursor-pointer"
                onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const newSaturation = Math.max(0, Math.min(100, (x / rect.width) * 100));
                  const newLightness = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
                  setSaturation(newSaturation);
                  setLightness(newLightness);
                  handleHslChange(hue, newSaturation, newLightness);
                }}
              />
            </div>
          </div>

          {/* Opacity slider section (conditionally rendered) */}
          {onOpacityChange && (
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-slate-600 dark:text-slate-400">Opacity</span>
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                  {Math.round(alpha * 100)}%
                </span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* Checkerboard background for opacity visualization */}
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                  }}
                />
                {/* Opacity gradient overlay */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to right, ${value}00, ${value}ff)`
                  }}
                />
                {/* Hidden slider for opacity control */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={alpha}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Adjust opacity"
                  aria-valuenow={alpha}
                  aria-valuemin={0}
                  aria-valuemax={1}
                />
                {/* Visual slider thumb */}
                <div 
                  className="absolute top-0 h-full w-1 bg-white border border-slate-400 rounded"
                  style={{ left: `${alpha * 100}%`, transform: 'translateX(-50%)' }}
                />
              </div>
            </div>
          )}

          {/* Color input fields section */}
          <div className="grid grid-cols-2 gap-3">
            {/* Hex color input */}
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Hex Color
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const newColor = e.target.value;
                  // Validate hex format before updating
                  if (/^#[0-9A-F]{6}$/i.test(newColor)) {
                    onChange(newColor);
                    const hsl = hexToHsl(newColor);
                    setHue(hsl.h);
                    setSaturation(hsl.s);
                    setLightness(hsl.l);
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                placeholder="#000000"
                maxLength={7}
                aria-label="Enter hex color code"
              />
            </div>
            {/* Opacity percentage input (if enabled) */}
            {onOpacityChange && (
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Opacity %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(alpha * 100)}
                  onChange={(e) => {
                    const percent = parseInt(e.target.value);
                    if (!isNaN(percent) && percent >= 0 && percent <= 100) {
                      handleOpacityChange(percent / 100);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  aria-label="Enter opacity percentage"
                />
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-4 w-full py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close color picker"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;