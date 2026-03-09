import { useState, useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

/**
 * Configuration options for the undo/redo hook
 */
interface UndoRedoConfig<T> {
    maxHistorySize?: number;
    ignoreIdenticalStates?: boolean;
    shouldIgnore?: (state: T) => boolean;
}

/**
 * Return type for the useUndoRedo hook
 */
interface UndoRedoReturn<T> {
    present: T;
    past: T[];
    future: T[];
    canUndo: boolean;
    canRedo: boolean;

    undo: () => void;
    redo: () => void;

    /**
     * Works like React setState:
     * setState(value) OR setState(prev => newValue)
     * Adds to history.
     */
    setState: Dispatch<SetStateAction<T>>;

    /**
     * Works like React setState:
     * replaceState(value) OR replaceState(prev => newValue)
     * Does NOT add to history.
     */
    replaceState: Dispatch<SetStateAction<T>>;

    clearHistory: () => void;
}

/**
 * Custom hook for managing undo/redo functionality
 */
export function useUndoRedo<T>(
    initialState: T,
    config: UndoRedoConfig<T> = {}
): UndoRedoReturn<T> {
    const {
        maxHistorySize = 50,
        ignoreIdenticalStates = true,
        shouldIgnore,
    } = config;

    // History state
    const [past, setPast] = useState<T[]>([]);
    const [present, setPresent] = useState<T>(initialState);
    const [future, setFuture] = useState<T[]>([]);

    // Refs (useful for debugging / future features)
    const previousPresentRef = useRef<T>(initialState);

    /**
     * Helper: resolve SetStateAction<T> into T
     */
    const resolveAction = useCallback(
        (action: SetStateAction<T>): T => {
            return typeof action === "function"
                ? (action as (prev: T) => T)(present)
                : action;
        },
        [present]
    );

    /**
     * setState (adds to history)
     */
    const setState: Dispatch<SetStateAction<T>> = useCallback(
        (action) => {
            setPresent((currentPresent) => {
                const newState = typeof action === "function"
                    ? (action as (prev: T) => T)(currentPresent)
                    : action;

                // Ignore identical states
                if (
                    ignoreIdenticalStates &&
                    JSON.stringify(newState) === JSON.stringify(currentPresent)
                ) {
                    return currentPresent;
                }

                // Ignore custom rule
                if (shouldIgnore?.(newState)) {
                    return currentPresent;
                }

                // Push current present into past
                setPast((prevPast) => {
                    const updated = [...prevPast, currentPresent];
                    return updated.length > maxHistorySize
                        ? updated.slice(-maxHistorySize)
                        : updated;
                });

                // Clear redo stack
                setFuture([]);

                previousPresentRef.current = currentPresent;
                return newState;
            });
        },
        [
            ignoreIdenticalStates,
            shouldIgnore,
            maxHistorySize,
        ]
    );

    /**
     * replaceState (does NOT add to history)
     */
    const replaceState: Dispatch<SetStateAction<T>> = useCallback(
        (action) => {
            setPresent((currentPresent) => {
                const newState = typeof action === "function"
                    ? (action as (prev: T) => T)(currentPresent)
                    : action;
                
                previousPresentRef.current = currentPresent;
                return newState;
            });
        },
        []
    );

    /**
     * Undo
     */
    const undo = useCallback(() => {
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);

        setFuture((prevFuture) => [present, ...prevFuture]);
        setPast(newPast);
        setPresent(previous);

        previousPresentRef.current = present;
    }, [past, present]);

    /**
     * Redo
     */
    const redo = useCallback(() => {
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        setPast((prevPast) => {
            const updated = [...prevPast, present];
            return updated.length > maxHistorySize
                ? updated.slice(-maxHistorySize)
                : updated;
        });

        setFuture(newFuture);
        setPresent(next);

        previousPresentRef.current = present;
    }, [future, present, maxHistorySize]);

    /**
     * Clear history
     */
    const clearHistory = useCallback(() => {
        setPast([]);
        setFuture([]);
    }, []);

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
        clearHistory,
    };
}

/**
 * Type guard to check if a state is part of undo history
 */
export function isInHistory(
    value: unknown
): value is { past: unknown[]; present: unknown; future: unknown[] } {
    return (
        typeof value === "object" &&
        value !== null &&
        "past" in value &&
        "present" in value &&
        "future" in value &&
        Array.isArray((value as any).past) &&
        Array.isArray((value as any).future)
    );
}
