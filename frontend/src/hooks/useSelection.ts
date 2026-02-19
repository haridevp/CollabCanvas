import { useState, useCallback, useRef } from 'react';
import type { Point, DrawingElement, ImageElement, SelectionState, TransformHandles } from '../types/canvas';

/**
 * Calculate distance from point to line segment
 */
const distanceToLineSegment = (p: Point, a: Point, b: Point): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);

    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const proj = {
        x: a.x + t * dx,
        y: a.y + t * dy
    };

    return Math.sqrt((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2);
};

/**
 * Custom hook for managing object selection and transformation
 * 
 * @param elements - Array of drawing elements
 * @param setElements - Function to update elements
 * @param zoomLevel - Current zoom level
 * @param panOffset - Current pan offset
 */
export function useSelection(
    elements: DrawingElement[],
    setElements: (elements: DrawingElement[] | ((prev: DrawingElement[]) => DrawingElement[])) => void,
    zoomLevel: number,
    panOffset: { x: number; y: number }
) {
    const [selection, setSelection] = useState<SelectionState>({
        selectedIds: [],
        isMultiSelect: false
    });

    const [transform, setTransform] = useState<TransformHandles>({
        isTransforming: false,
        transformType: 'none'
    });

    const selectionRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<Point | null>(null);
    const [dragBox, setDragBox] = useState<{ start: Point; end: Point } | null>(null);

    /**
     * Check if a point is inside an element
     */
    const isPointInElement = useCallback((point: Point, element: DrawingElement): boolean => {
        const dpr = window.devicePixelRatio || 1;

        switch (element.type) {
            case 'rectangle':
            case 'image':
            case 'text':
                if (element.x !== undefined && element.y !== undefined &&
                    element.width !== undefined && element.height !== undefined) {
                    return (
                        point.x >= element.x &&
                        point.x <= element.x + element.width &&
                        point.y >= element.y &&
                        point.y <= element.y + element.height
                    );
                }
                break;

            case 'circle':
                if (element.x !== undefined && element.y !== undefined &&
                    element.width !== undefined && element.height !== undefined) {
                    const centerX = element.x + element.width / 2;
                    const centerY = element.y + element.height / 2;
                    const radiusX = element.width / 2;
                    const radiusY = element.height / 2;

                    // Ellipse hit test
                    const dx = (point.x - centerX) / radiusX;
                    const dy = (point.y - centerY) / radiusY;
                    return (dx * dx + dy * dy) <= 1;
                }
                break;

            case 'line':
            case 'arrow':
                if (element.points && element.points.length === 2) {
                    const [start, end] = element.points;
                    // Simple line hit test (distance to line segment)
                    const d = distanceToLineSegment(point, start, end);
                    return d < 10; // 10px tolerance
                }
                break;

            case 'pencil':
            case 'eraser':
                if (element.points) {
                    // Check distance to any point in the stroke
                    for (const p of element.points) {
                        const dx = point.x - p.x;
                        const dy = point.y - p.y;
                        if (Math.sqrt(dx * dx + dy * dy) < 10) {
                            return true;
                        }
                    }
                }
                break;
        }

        return false;
    }, []);

    /**
     * Find element at given coordinates
     */
    const findElementAtPoint = useCallback((point: Point): DrawingElement | null => {
        // Search in reverse order (top-most first)
        for (let i = elements.length - 1; i >= 0; i--) {
            const element = elements[i];
            if (isPointInElement(point, element)) {
                return element;
            }
        }
        return null;
    }, [elements, isPointInElement]);

    /**
     * Handle selection on mouse down
     */
    const handleSelectionStart = useCallback((e: React.MouseEvent, point: Point) => {
        const element = findElementAtPoint(point);

        if (e.shiftKey) {
            // Multi-select with shift key
            if (element) {
                setSelection(prev => {
                    const newIds = prev.selectedIds.includes(element.id)
                        ? prev.selectedIds.filter(id => id !== element.id)
                        : [...prev.selectedIds, element.id];

                    return {
                        ...prev,
                        selectedIds: newIds,
                        isMultiSelect: newIds.length > 1
                    };
                });
            }
        } else {
            // Single select
            if (element) {
                setSelection({
                    selectedIds: [element.id],
                    isMultiSelect: false,
                    lastClickTime: Date.now(),
                    lastClickedId: element.id
                });
            } else {
                // Start drag box selection
                dragStartRef.current = point;
                setDragBox({ start: point, end: point });
                setSelection({ selectedIds: [], isMultiSelect: false });
            }
        }
    }, [findElementAtPoint]);

    /**
     * Handle drag box selection
     */
    const handleDragBox = useCallback((point: Point) => {
        if (dragStartRef.current) {
            setDragBox({
                start: dragStartRef.current,
                end: point
            });
        }
    }, []);

    /**
     * Complete drag box selection
     */
    const handleSelectionEnd = useCallback((point: Point) => {
        if (dragBox) {
            const { start, end } = dragBox;

            // Calculate box bounds
            const box = {
                x: Math.min(start.x, end.x),
                y: Math.min(start.y, end.y),
                width: Math.abs(end.x - start.x),
                height: Math.abs(end.y - start.y)
            };

            // Find all elements inside the box
            const selectedIds = elements
                .filter(element => {
                    if (element.x !== undefined && element.y !== undefined) {
                        return (
                            element.x >= box.x &&
                            element.y >= box.y &&
                            element.x + (element.width || 0) <= box.x + box.width &&
                            element.y + (element.height || 0) <= box.y + box.height
                        );
                    }
                    return false;
                })
                .map(el => el.id);

            setSelection({
                selectedIds,
                isMultiSelect: selectedIds.length > 1
            });

            setDragBox(null);
            dragStartRef.current = null;
        }
    }, [elements, dragBox]);

    /**
     * Start moving selected objects
     */
    const startMove = useCallback((e: React.MouseEvent, point: Point) => {
        if (selection.selectedIds.length === 0) return;

        // Store initial positions of all selected objects
        const selectedElements = elements.filter(el => selection.selectedIds.includes(el.id));
        const initialProps = selectedElements.map(el => ({
            id: el.id,
            x: el.x || 0,
            y: el.y || 0
        }));

        setTransform({
            isTransforming: true,
            transformType: 'move',
            initialMousePos: point,
            initialProps: {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                rotation: 0
            }
        });

        // Store initial positions in a ref for the move handler
        const moveHandler = (movePoint: Point) => {
            if (!transform.initialMousePos) return;

            const dx = movePoint.x - transform.initialMousePos.x;
            const dy = movePoint.y - transform.initialMousePos.y;

            // Update all selected elements
            setElements(prev => prev.map(el => {
                if (selection.selectedIds.includes(el.id)) {
                    const initial = initialProps.find(p => p.id === el.id);
                    if (initial) {
                        return {
                            ...el,
                            x: initial.x + dx,
                            y: initial.y + dy
                        };
                    }
                }
                return el;
            }));
        };

        return moveHandler;
    }, [selection.selectedIds, elements, setElements, transform]);

    /**
     * Start resizing an object
     */
    const startResize = useCallback((element: DrawingElement, handle: string, point: Point) => {
        setTransform({
            isTransforming: true,
            transformType: 'resize',
            activeHandle: handle as any,
            initialMousePos: point,
            initialProps: {
                x: element.x || 0,
                y: element.y || 0,
                width: element.width || 0,
                height: element.height || 0,
                rotation: 0
            }
        });
    }, []);

    /**
     * Handle transformation
     */
    const handleTransform = useCallback((point: Point) => {
        if (!transform.isTransforming || !transform.initialMousePos || !transform.initialProps) return;

        const dx = point.x - transform.initialMousePos.x;
        const dy = point.y - transform.initialMousePos.y;

        if (transform.transformType === 'move') {
            // Move is handled in startMove
            return;
        } else if (transform.transformType === 'resize' && selection.selectedIds.length === 1) {
            // Resize single selected object
            const elementId = selection.selectedIds[0];

            setElements(prev => prev.map(el => {
                if (el.id === elementId) {
                    let newX = transform.initialProps!.x;
                    let newY = transform.initialProps!.y;
                    let newWidth = transform.initialProps!.width;
                    let newHeight = transform.initialProps!.height;

                    switch (transform.activeHandle) {
                        case 'top-left':
                            newX = transform.initialProps!.x + dx;
                            newY = transform.initialProps!.y + dy;
                            newWidth = transform.initialProps!.width - dx;
                            newHeight = transform.initialProps!.height - dy;
                            break;
                        case 'top-right':
                            newY = transform.initialProps!.y + dy;
                            newWidth = transform.initialProps!.width + dx;
                            newHeight = transform.initialProps!.height - dy;
                            break;
                        case 'bottom-left':
                            newX = transform.initialProps!.x + dx;
                            newWidth = transform.initialProps!.width - dx;
                            newHeight = transform.initialProps!.height + dy;
                            break;
                        case 'bottom-right':
                            newWidth = transform.initialProps!.width + dx;
                            newHeight = transform.initialProps!.height + dy;
                            break;
                    }

                    // Maintain aspect ratio for images
                    if (el.type === 'image') {
                        const imgEl = el as ImageElement;
                        if (imgEl.originalWidth && imgEl.originalHeight) {
                            const aspectRatio = imgEl.originalWidth / imgEl.originalHeight;
                            if (Math.abs(dx) > Math.abs(dy)) {
                                newHeight = newWidth / aspectRatio;
                            } else {
                                newWidth = newHeight * aspectRatio;
                            }
                        }
                    }

                    return {
                        ...el,
                        x: newX,
                        y: newY,
                        width: Math.max(10, Math.abs(newWidth)),
                        height: Math.max(10, Math.abs(newHeight))
                    };
                }
                return el;
            }));
        }
    }, [transform, selection.selectedIds, setElements]);

    /**
     * End transformation
     */
    const endTransform = useCallback(() => {
        setTransform({
            isTransforming: false,
            transformType: 'none'
        });
    }, []);

    /**
     * Clear selection
     */
    const clearSelection = useCallback(() => {
        setSelection({ selectedIds: [], isMultiSelect: false });
    }, []);

    /**
     * Delete selected objects
     */
    const deleteSelected = useCallback(() => {
        if (selection.selectedIds.length > 0) {
            setElements(prev => prev.filter(el => !selection.selectedIds.includes(el.id)));
            clearSelection();
        }
    }, [selection.selectedIds, setElements, clearSelection]);

    /**
     * Duplicate selected objects
     */
    const duplicateSelected = useCallback(() => {
        if (selection.selectedIds.length === 0) return;

        const newElements = elements
            .filter(el => selection.selectedIds.includes(el.id))
            .map(el => ({
                ...el,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                x: (el.x || 0) + 20, // Offset by 20px
                y: (el.y || 0) + 20
            }));

        setElements(prev => [...prev, ...newElements]);

        // Select the new duplicates
        setSelection({
            selectedIds: newElements.map(el => el.id),
            isMultiSelect: newElements.length > 1
        });
    }, [elements, selection.selectedIds, setElements]);

    /**
     * Bring to front
     */
    const bringToFront = useCallback(() => {
        if (selection.selectedIds.length === 0) return;

        const selected = elements.filter(el => selection.selectedIds.includes(el.id));
        const others = elements.filter(el => !selection.selectedIds.includes(el.id));

        setElements([...others, ...selected]);
    }, [elements, selection.selectedIds, setElements]);

    /**
     * Send to back
     */
    const sendToBack = useCallback(() => {
        if (selection.selectedIds.length === 0) return;

        const selected = elements.filter(el => selection.selectedIds.includes(el.id));
        const others = elements.filter(el => !selection.selectedIds.includes(el.id));

        setElements([...selected, ...others]);
    }, [elements, selection.selectedIds, setElements]);

    return {
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
    };
}