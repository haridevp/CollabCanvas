import { useState, useCallback, useEffect } from 'react';
import type { DrawingElement } from '../types/canvas';

/**
 * Interface for clipboard data structure
 */
interface ClipboardData {
    elements: DrawingElement[];
    timestamp: number;
    sourceIds: string[]; // Original IDs for reference
}

/**
 * Custom hook for managing clipboard operations (copy, cut, paste)
 * 
 * @param elements - Current canvas elements
 * @param setElements - Function to update elements
 * @param selectedIds - Currently selected element IDs
 * @param clearSelection - Function to clear selection
 * @param setSelection - Function to set selection
 * 
 * @returns Clipboard operations and state
 */
export function useClipboard(
    elements: DrawingElement[],
    setElements: (elements: DrawingElement[] | ((prev: DrawingElement[]) => DrawingElement[])) => void,
    selectedIds: string[],
    clearSelection: () => void,
    setSelection: (selection: { selectedIds: string[]; isMultiSelect: boolean }) => void
) {
    const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
    const [canPaste, setCanPaste] = useState<boolean>(false);

    /**
     * Check if there's content in the system clipboard (for external paste)
     */
    useEffect(() => {
        const checkClipboard = async () => {
            try {
                // Check if clipboard API is available
                if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
                    // This will prompt for permission, so we don't call it automatically
                    // Instead, we'll check on paste attempt
                    setCanPaste(true);
                }
            } catch (error) {
                console.warn('Clipboard API not available:', error);
                setCanPaste(false);
            }
        };

        checkClipboard();
    }, []);

    /**
     * Copy selected elements to clipboard
     */
    const copyToClipboard = useCallback(async () => {
        if (selectedIds.length === 0) return false;

        // Get selected elements
        const selectedElements = elements.filter(el => selectedIds.includes(el.id));

        if (selectedElements.length === 0) return false;

        // Prepare clipboard data
        const clipboardData: ClipboardData = {
            elements: selectedElements.map(el => ({
                ...el,
                // Generate new IDs when pasting, but keep originals for reference
                id: `temp-${el.id}`
            })),
            timestamp: Date.now(),
            sourceIds: selectedIds
        };

        // Store in our internal clipboard
        setClipboard(clipboardData);

        // Also try to store in system clipboard for external apps
        try {
            const serialized = JSON.stringify(clipboardData.elements, null, 2);
            await navigator.clipboard.writeText(serialized);
        } catch (error) {
            console.warn('Could not write to system clipboard:', error);
            // Still works with internal clipboard
        }

        return true;
    }, [elements, selectedIds]);

    /**
     * Cut selected elements (copy + delete)
     */
    const cutToClipboard = useCallback(async () => {
        if (selectedIds.length === 0) return false;

        // First copy to clipboard
        const copied = await copyToClipboard();

        if (copied) {
            // Then delete selected elements
            setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
            clearSelection();
        }

        return copied;
    }, [selectedIds, copyToClipboard, setElements, clearSelection]);

    /**
     * Paste elements from clipboard
     * @param offsetX - Optional X offset for paste position (e.g., cursor position)
     * @param offsetY - Optional Y offset for paste position
     */
    const pasteFromClipboard = useCallback(async (offsetX?: number, offsetY?: number) => {
        let elementsToPaste: DrawingElement[] = [];

        // Try to get from internal clipboard first
        if (clipboard) {
            elementsToPaste = clipboard.elements;
        } else {
            // Try to read from system clipboard
            try {
                const text = await navigator.clipboard.readText();
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                    elementsToPaste = parsed;
                }
            } catch (error) {
                console.warn('Could not read from system clipboard:', error);
                return false;
            }
        }

        if (elementsToPaste.length === 0) return false;

        // Calculate paste offset (default to 20px if no offset provided)
        const pasteOffsetX = offsetX || 20;
        const pasteOffsetY = offsetY || 20;

        // Generate new IDs and apply offset
        const newElements = elementsToPaste.map(el => {
            // Generate unique ID
            const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Apply offset to position
            let newEl: DrawingElement = {
                ...el,
                id: newId,
            };

            // Apply offset to different element types
            if (newEl.x !== undefined && newEl.y !== undefined) {
                newEl = {
                    ...newEl,
                    x: newEl.x + pasteOffsetX,
                    y: newEl.y + pasteOffsetY
                };
            }

            if (newEl.points) {
                newEl = {
                    ...newEl,
                    points: newEl.points.map(p => ({
                        x: p.x + pasteOffsetX,
                        y: p.y + pasteOffsetY
                    }))
                };
            }

            return newEl;
        });

        // Add to canvas
        setElements(prev => [...prev, ...newElements]);

        // Select the newly pasted elements
        setSelection({
            selectedIds: newElements.map(el => el.id),
            isMultiSelect: newElements.length > 1
        });

        return true;
    }, [clipboard, setElements, setSelection]);

    /**
     * Clear internal clipboard
     */
    const clearClipboard = useCallback(() => {
        setClipboard(null);
    }, []);

    /**
     * Check if there's content to paste
     */
    const hasClipboardContent = useCallback(() => {
        return clipboard !== null;
    }, [clipboard]);

    return {
        clipboard,
        canPaste,
        copyToClipboard,
        cutToClipboard,
        pasteFromClipboard,
        clearClipboard,
        hasClipboardContent
    };
}