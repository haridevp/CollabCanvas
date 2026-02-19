import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Configuration options for the undo/redo hook
 * 
 * @interface UndoRedoConfig
 * @property {number} [maxHistorySize=50] - Maximum number of states to keep in history
 * @property {boolean} [ignoreIdenticalStates=true] - Whether to ignore states that are identical to current
 * @property {(state: T) => boolean} [shouldIgnore] - Custom function to determine if a state should be ignored
 */
interface UndoRedoConfig<T> {
    maxHistorySize?: number;
    ignoreIdenticalStates?: boolean;
    shouldIgnore?: (state: T) => boolean;
}

/**
 * Return type for the useUndoRedo hook
 * 
 * @interface UndoRedoReturn
 * @template T - The type of state being managed
 * @property {T} present - Current state
 * @property {T[]} past - Array of past states
 * @property {T[]} future - Array of future states (for redo)
 * @property {boolean} canUndo - Whether undo operation is available
 * @property {boolean} canRedo - Whether redo operation is available
 * @property {() => void} undo - Undo function
 * @property {() => void} redo - Redo function
 * @property {(newState: T) => void} setState - Set new state (adds to history)
 * @property {(newState: T) => void} replaceState - Replace current state without adding to history
 * @property {() => void} clearHistory - Clear all history
 */
interface UndoRedoReturn<T> {
    present: T;
    past: T[];
    future: T[];
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
    setState: (newState: T) => void;
    replaceState: (newState: T) => void;
    clearHistory: () => void;
}

/**
 * Custom hook for managing undo/redo functionality
 * 
 * @template T - The type of state being managed
 * @param {T} initialState - Initial state value
 * @param {UndoRedoConfig<T>} config - Configuration options
 * @returns {UndoRedoReturn<T>} Undo/redo state and functions
 * 
 * @example
 * ```tsx
 * const {
 *   present: elements,
 *   setState: setElements,
 *   undo,
 *   redo,
 *   canUndo,
 *   canRedo
 * } = useUndoRedo<DrawingElement[]>([]);
 * 
 * // When adding a new element
 * const addElement = (element) => {
 *   setState([...elements, element]);
 * };
 * 
 * // Handle keyboard shortcuts
 * useEffect(() => {
 *   const handleKeyDown = (e) => {
 *     if (e.ctrlKey && e.key === 'z') {
 *       e.preventDefault();
 *       undo();
 *     }
 *     if (e.ctrlKey && e.key === 'y') {
 *       e.preventDefault();
 *       redo();
 *     }
 *   };
 *   
 *   window.addEventListener('keydown', handleKeyDown);
 *   return () => window.removeEventListener('keydown', handleKeyDown);
 * }, [undo, redo]);
 * ```
 */
export function useUndoRedo<T>(
    initialState: T,
    config: UndoRedoConfig<T> = {}
): UndoRedoReturn<T> {
    const {
        maxHistorySize = 50,
        ignoreIdenticalStates = true,
        shouldIgnore
    } = config;

    // History state
    const [past, setPast] = useState<T[]>([]);
    const [present, setPresent] = useState<T>(initialState);
    const [future, setFuture] = useState<T[]>([]);

    // Refs for tracking during renders
    const isUndoRedoRef = useRef(false);
    const previousPresentRef = useRef<T>(initialState);

    /**
     * Update the present state and manage history
     * 
     * @function setState
     * @param {T} newState - New state to set
     * @param {boolean} addToHistory - Whether to add current state to past
     */
    const setState = useCallback((newState: T, addToHistory: boolean = true) => {
        // Skip if state is identical and we're ignoring identical states
        if (ignoreIdenticalStates && JSON.stringify(newState) === JSON.stringify(present)) {
            return;
        }

        // Skip if custom ignore function returns true
        if (shouldIgnore?.(newState)) {
            return;
        }

        if (addToHistory) {
            // Add current present to past
            setPast(prevPast => {
                const newPast = [...prevPast, present];
                // Limit history size
                if (newPast.length > maxHistorySize) {
                    return newPast.slice(-maxHistorySize);
                }
                return newPast;
            });
            // Clear future when new state is added
            setFuture([]);
        }

        setPresent(newState);
        previousPresentRef.current = present;
    }, [present, ignoreIdenticalStates, shouldIgnore, maxHistorySize]);

    /**
     * Replace current state without adding to history
     * Useful for real-time updates during drawing
     * 
     * @function replaceState
     * @param {T} newState - New state to set
     */
    const replaceState = useCallback((newState: T) => {
        setPresent(newState);
        previousPresentRef.current = present;
    }, [present]);

    /**
     * Undo the last action
     */
    const undo = useCallback(() => {
        if (past.length === 0) return;

        isUndoRedoRef.current = true;

        // Get the previous state
        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);

        // Move current present to future
        setFuture(prevFuture => [present, ...prevFuture]);
        setPast(newPast);
        setPresent(previous);
        previousPresentRef.current = present;

        // Reset flag after state updates
        setTimeout(() => {
            isUndoRedoRef.current = false;
        }, 0);
    }, [past, present]);

    /**
     * Redo a previously undone action
     */
    const redo = useCallback(() => {
        if (future.length === 0) return;

        isUndoRedoRef.current = true;

        // Get the next state
        const next = future[0];
        const newFuture = future.slice(1);

        // Move current present to past
        setPast(prevPast => {
            const newPast = [...prevPast, present];
            // Limit history size
            if (newPast.length > maxHistorySize) {
                return newPast.slice(-maxHistorySize);
            }
            return newPast;
        });
        setFuture(newFuture);
        setPresent(next);
        previousPresentRef.current = present;

        // Reset flag after state updates
        setTimeout(() => {
            isUndoRedoRef.current = false;
        }, 0);
    }, [future, present, maxHistorySize]);

    /**
     * Clear all history
     */
    const clearHistory = useCallback(() => {
        setPast([]);
        setFuture([]);
    }, []);

    /**
     * Reset to a specific state (useful for loading saved states)
     * 
     * @function resetToState
     * @param {T} newState - State to reset to
     * @param {boolean} clearExistingHistory - Whether to clear existing history
     */
    const resetToState = useCallback((newState: T, clearExistingHistory: boolean = true) => {
        if (clearExistingHistory) {
            setPast([]);
            setFuture([]);
        }
        setPresent(newState);
        previousPresentRef.current = present;
    }, [present]);

    return {
        present,
        past,
        future,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        undo,
        redo,
        setState,
        replaceState,
        clearHistory
    };
}

/**
 * Type guard to check if a state is part of undo history
 * 
 * @function isInHistory
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is a history state
 */
export function isInHistory(value: unknown): value is { past: unknown[]; present: unknown; future: unknown[] } {
    return (
        typeof value === 'object' &&
        value !== null &&
        'past' in value &&
        'present' in value &&
        'future' in value &&
        Array.isArray((value as any).past) &&
        Array.isArray((value as any).future)
    );
}