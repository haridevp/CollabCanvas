import React, { useState, useEffect, useRef } from 'react';
import {
    Bold, Italic, Underline, AlignLeft, AlignCenter,
    AlignRight, Type, X, Check, Palette
} from 'lucide-react';
import type { TextFormat } from '../../types/canvas';

/**
 * Props for the TextEditor component
 * 
 * @interface TextEditorProps
 */
interface TextEditorProps {
    /** Initial text content */
    initialText: string;
    /** Initial text format */
    initialFormat: TextFormat;
    /** Position of the text on canvas (x, y) */
    position: { x: number; y: number };
    /** Callback when text is saved */
    onSave: (text: string, format: TextFormat) => void;
    /** Callback when editing is cancelled */
    onCancel: () => void;
}

/**
 * Predefined font families
 */
const FONT_FAMILIES = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Trebuchet MS',
    'Impact',
    'Comic Sans MS',
    'Monaco'
];

/**
 * Predefined font sizes
 */
const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

/**
 * TextEditor Component
 * 
 * @component
 * @description
 * An inline text editor for adding and editing text on the canvas.
 * Features rich text formatting with font family, size, style controls,
 * and text alignment options.
 * 
 * @example
 * ```tsx
 * <TextEditor
 *   initialText="Hello World"
 *   initialFormat={{
 *     fontFamily: 'Arial',
 *     fontSize: 16,
 *     fontWeight: 'normal',
 *     fontStyle: 'normal',
 *     textDecoration: 'none',
 *     textAlign: 'left',
 *     color: '#000000'
 *   }}
 *   position={{ x: 100, y: 100 }}
 *   onSave={(text, format) => addTextElement(text, format, position)}
 *   onCancel={() => setShowTextEditor(false)}
 * />
 * ```
 */
const TextEditor: React.FC<TextEditorProps> = ({
    initialText,
    initialFormat,
    position,
    onSave,
    onCancel
}) => {
    const [text, setText] = useState<string>(initialText);
    const [format, setFormat] = useState<TextFormat>(initialFormat);
    const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    /**
     * Adjust textarea size based on content
     */
    const adjustTextareaSize = (): void => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            textareaRef.current.style.width = `${Math.max(200, textareaRef.current.scrollWidth)}px`;
        }
    };

    /**
     * Auto-focus textarea and adjust size on mount
     */
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            adjustTextareaSize();
        }
    }, []);

    /**
     * Handle text change
     */
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
        setText(e.target.value);
        adjustTextareaSize();
    };

    /**
     * Toggle bold formatting
     */
    const toggleBold = (): void => {
        setFormat(prev => ({
            ...prev,
            fontWeight: prev.fontWeight === 'bold' ? 'normal' : 'bold'
        }));
    };

    /**
     * Toggle italic formatting
     */
    const toggleItalic = (): void => {
        setFormat(prev => ({
            ...prev,
            fontStyle: prev.fontStyle === 'italic' ? 'normal' : 'italic'
        }));
    };

    /**
     * Toggle underline formatting
     */
    const toggleUnderline = (): void => {
        setFormat(prev => ({
            ...prev,
            textDecoration: prev.textDecoration === 'underline' ? 'none' : 'underline'
        }));
    };

    /**
     * Set text alignment
     */
    const setAlignment = (align: 'left' | 'center' | 'right'): void => {
        setFormat(prev => ({ ...prev, textAlign: align }));
    };

    /**
     * Handle save
     */
    const handleSave = (): void => {
        if (text.trim()) {
            onSave(text, format);
        } else {
            onCancel();
        }
    };

    /**
     * Handle keyboard shortcuts
     */
    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    return (
        <div
            ref={containerRef}
            className="absolute z-50 bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                minWidth: '300px'
            }}
        >
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700">
                {/* Font Family */}
                <select
                    value={format.fontFamily}
                    onChange={(e) => setFormat(prev => ({ ...prev, fontFamily: e.target.value }))}
                    className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    aria-label="Font family"
                >
                    {FONT_FAMILIES.map(font => (
                        <option key={font} value={font} style={{ fontFamily: font }}>
                            {font}
                        </option>
                    ))}
                </select>

                {/* Font Size */}
                <select
                    value={format.fontSize}
                    onChange={(e) => setFormat(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                    className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    aria-label="Font size"
                >
                    {FONT_SIZES.map(size => (
                        <option key={size} value={size}>
                            {size}px
                        </option>
                    ))}
                </select>

                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

                {/* Bold */}
                <button
                    onClick={toggleBold}
                    className={`p-1.5 rounded transition-colors ${format.fontWeight === 'bold'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    title="Bold (Ctrl+B)"
                >
                    <Bold size={16} />
                </button>

                {/* Italic */}
                <button
                    onClick={toggleItalic}
                    className={`p-1.5 rounded transition-colors ${format.fontStyle === 'italic'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    title="Italic (Ctrl+I)"
                >
                    <Italic size={16} />
                </button>

                {/* Underline */}
                <button
                    onClick={toggleUnderline}
                    className={`p-1.5 rounded transition-colors ${format.textDecoration === 'underline'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    title="Underline (Ctrl+U)"
                >
                    <Underline size={16} />
                </button>

                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

                {/* Alignment */}
                <button
                    onClick={() => setAlignment('left')}
                    className={`p-1.5 rounded transition-colors ${format.textAlign === 'left'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    title="Align Left"
                >
                    <AlignLeft size={16} />
                </button>
                <button
                    onClick={() => setAlignment('center')}
                    className={`p-1.5 rounded transition-colors ${format.textAlign === 'center'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    title="Align Center"
                >
                    <AlignCenter size={16} />
                </button>
                <button
                    onClick={() => setAlignment('right')}
                    className={`p-1.5 rounded transition-colors ${format.textAlign === 'right'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    title="Align Right"
                >
                    <AlignRight size={16} />
                </button>

                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

                {/* Text Color */}
                <div className="relative">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                        title="Text Color"
                    >
                        <div className="relative">
                            <Palette size={16} />
                            <div
                                className="absolute -bottom-1 left-0 w-4 h-1 rounded-full"
                                style={{ backgroundColor: format.color }}
                            />
                        </div>
                    </button>

                    {/* Simple color picker */}
                    {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                            <div className="grid grid-cols-5 gap-1">
                                {['#000000', '#ef4444', '#10b981', '#3b82f6', '#f59e0b',
                                    '#8b5cf6', '#ec4899', '#6b7280', '#ffffff'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => {
                                                setFormat(prev => ({ ...prev, color }));
                                                setShowColorPicker(false);
                                            }}
                                            className="w-6 h-6 rounded border border-slate-200 dark:border-slate-700 hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1" />

                {/* Cancel button */}
                <button
                    onClick={onCancel}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    title="Cancel (Esc)"
                >
                    <X size={16} />
                </button>

                {/* Save button */}
                <button
                    onClick={handleSave}
                    className="p-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white"
                    title="Save (Ctrl+Enter)"
                >
                    <Check size={16} />
                </button>
            </div>

            {/* Text input area */}
            <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                className="w-full p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none outline-none rounded-b-lg"
                style={{
                    fontFamily: format.fontFamily,
                    fontSize: `${format.fontSize}px`,
                    fontWeight: format.fontWeight,
                    fontStyle: format.fontStyle,
                    textDecoration: format.textDecoration,
                    textAlign: format.textAlign,
                    color: format.color,
                    minHeight: '60px'
                }}
                placeholder="Type your text here..."
                autoFocus
            />

            {/* Help text */}
            <div className="px-3 py-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                <span className="mr-3">Ctrl+Enter to save</span>
                <span>Esc to cancel</span>
            </div>
        </div>
    );
};

export default TextEditor;