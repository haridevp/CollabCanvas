import { useCallback, useEffect, useRef, useState } from 'react';
import type { DrawingElement } from '../types/canvas';

/**
 * Props for useAutoSave hook
 */
interface UseAutoSaveProps {
    /** Current canvas elements */
    elements: DrawingElement[];
    /** Room ID for saving */
    roomId?: string;
    /** Whether auto-save is enabled */
    enabled?: boolean;
    /** Auto-save interval in milliseconds (default: 30000 - 30 seconds) */
    interval?: number;
    /** Callback when save is triggered */
    onSave?: (elements: DrawingElement[], roomId: string) => Promise<void>;
    /** Callback when save succeeds */
    onSaveSuccess?: (timestamp: number) => void;
    /** Callback when save fails */
    onSaveError?: (error: Error) => void;
    /** Whether to show save notifications */
    showNotifications?: boolean;
}

/**
 * Return type for useAutoSave hook
 */
interface UseAutoSaveReturn {
    /** Last save timestamp */
    lastSaveTime: Date | null;
    /** Whether auto-save is enabled */
    isAutoSaveEnabled: boolean;
    /** Toggle auto-save on/off */
    toggleAutoSave: (enabled: boolean) => void;
    /** Manually trigger a save */
    manualSave: () => Promise<boolean>;
    /** Number of unsaved changes */
    unsavedChanges: number;
    /** Whether a save is in progress */
    isSaving: boolean;
    /** Last save error if any */
    lastError: Error | null;
    /** Reset auto-save timer */
    resetTimer: () => void;
}

/**
 * Custom hook for auto-saving canvas state
 * 
 * @param props - Auto-save configuration
 * @returns Auto-save state and controls
 */
export function useAutoSave({
    elements,
    roomId,
    enabled = true,
    interval = 30000, // 30 seconds default
    onSave,
    onSaveSuccess,
    onSaveError,
    showNotifications = true
}: UseAutoSaveProps): UseAutoSaveReturn {
    const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(enabled);
    const [unsavedChanges, setUnsavedChanges] = useState<number>(0);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [lastError, setLastError] = useState<Error | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const previousElementsRef = useRef<string>('');
    const saveInProgressRef = useRef<boolean>(false);

    /**
     * Track unsaved changes by comparing element states
     */
    useEffect(() => {
        const currentState = JSON.stringify(elements);

        if (previousElementsRef.current && previousElementsRef.current !== currentState) {
            setUnsavedChanges(prev => prev + 1);
        }

        previousElementsRef.current = currentState;
    }, [elements]);

    /**
     * Perform the actual save operation
     */
    const performSave = useCallback(async (isManual: boolean = false): Promise<boolean> => {
        if (!roomId) {
            console.warn('Cannot save: No room ID provided');
            return false;
        }

        if (saveInProgressRef.current) {
            console.log('Save already in progress, skipping...');
            return false;
        }

        // Don't save if there are no changes (unless it's a manual save)
        if (unsavedChanges === 0 && !isManual) {
            return false;
        }

        setIsSaving(true);
        saveInProgressRef.current = true;
        setLastError(null);

        try {
            if (onSave) {
                await onSave(elements, roomId);
            } else {
                // Default save behavior - you can customize this
                const response = await fetch('/api/canvas/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        roomId,
                        elements,
                        timestamp: Date.now(),
                        version: '1.0'
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Save failed: ${response.statusText}`);
                }
            }

            const saveTime = new Date();
            setLastSaveTime(saveTime);
            setUnsavedChanges(0);
            setLastError(null);

            if (showNotifications && !isManual) {
                // You could trigger a toast notification here
                console.log('Auto-save completed at', saveTime.toLocaleTimeString());
            }

            if (onSaveSuccess) {
                onSaveSuccess(saveTime.getTime());
            }

            return true;
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown save error');
            setLastError(err);

            if (showNotifications) {
                console.error('Auto-save failed:', err.message);
            }

            if (onSaveError) {
                onSaveError(err);
            }

            return false;
        } finally {
            setIsSaving(false);
            saveInProgressRef.current = false;
        }
    }, [elements, roomId, unsavedChanges, onSave, onSaveSuccess, onSaveError, showNotifications]);

    /**
     * Manual save trigger
     */
    const manualSave = useCallback(async (): Promise<boolean> => {
        return performSave(true);
    }, [performSave]);

    /**
     * Toggle auto-save on/off
     */
    const toggleAutoSave = useCallback((newState: boolean) => {
        setIsAutoSaveEnabled(newState);

        if (!newState && timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    /**
     * Reset the auto-save timer
     */
    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (isAutoSaveEnabled && roomId) {
            timerRef.current = setInterval(() => {
                performSave(false);
            }, interval);
        }
    }, [isAutoSaveEnabled, roomId, interval, performSave]);

    /**
     * Set up auto-save timer
     */
    useEffect(() => {
        if (!roomId) return;

        resetTimer();

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [roomId, isAutoSaveEnabled, interval, resetTimer]);

    /**
     * Save before unload
     */
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (unsavedChanges > 0) {
                // Perform a synchronous save attempt
                if (roomId && onSave) {
                    // Note: This is a best-effort save, may not complete if page unloads quickly
                    navigator.sendBeacon('/api/canvas/save', JSON.stringify({
                        roomId,
                        elements,
                        timestamp: Date.now(),
                        isEmergency: true
                    }));
                }

                // Show confirmation dialog
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [unsavedChanges, roomId, elements, onSave]);

    return {
        lastSaveTime,
        isAutoSaveEnabled,
        toggleAutoSave,
        manualSave,
        unsavedChanges,
        isSaving,
        lastError,
        resetTimer
    };
}