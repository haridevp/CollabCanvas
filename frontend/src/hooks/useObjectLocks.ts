import { useState, useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

/**
 * Interface for lock information
 */
export interface LockInfo {
    userId: string;
    username: string;
    color: string;
    timestamp: number;
    elementId: string;
}

/**
 * Props for useObjectLocks hook
 */
interface UseObjectLocksProps {
    socket: Socket | null;
    roomId: string | undefined;
    userId: string | undefined;
    username: string | undefined;
    userColor?: string;
    lockTimeout?: number; // milliseconds before auto-release
    isConnected?: boolean; // Add this for offline support
    queueAction?: (type: string, data: any) => string; // Add this for offline queue
}

/**
 * Custom hook for managing object locking in collaborative environments
 * 
 * @param props - Hook properties
 * @returns Lock state and functions
 */
export function useObjectLocks({
    socket,
    roomId,
    userId,
    username,
    userColor = '#3b82f6',
    lockTimeout = 30000, // 30 seconds default
    isConnected = true,
    queueAction
}: UseObjectLocksProps) {
    const [lockedObjects, setLockedObjects] = useState<Record<string, LockInfo>>({});
    const [myLocks, setMyLocks] = useState<Set<string>>(new Set());

    // Refs for timeout management
    const lockTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

    /**
     * Clear timeout for a specific lock
     */
    const clearLockTimeout = useCallback((elementId: string) => {
        if (lockTimeoutsRef.current[elementId]) {
            clearTimeout(lockTimeoutsRef.current[elementId]);
            delete lockTimeoutsRef.current[elementId];
        }
    }, []);

    /**
     * Release a lock on an object
     */
    const releaseLock = useCallback((elementId: string, isAutoRelease: boolean = false) => {
        if (!roomId || !userId) return;

        if (myLocks.has(elementId)) {
            const releaseData = {
                roomId,
                elementId,
                userId,
                isAutoRelease
            };

            if (socket && isConnected) {
                socket.emit('release-lock', releaseData);
            } else if (queueAction) {
                queueAction('release-lock', releaseData);
            }

            // Optimistically update local state
            setMyLocks(prev => {
                const next = new Set(prev);
                next.delete(elementId);
                return next;
            });

            clearLockTimeout(elementId);
        }
    }, [socket, roomId, userId, myLocks, clearLockTimeout, isConnected, queueAction]);

    /**
     * Set timeout to auto-release a lock
     */
    const setLockTimeout = useCallback((elementId: string) => {
        clearLockTimeout(elementId);

        lockTimeoutsRef.current[elementId] = setTimeout(() => {
            // Auto-release the lock after timeout
            if (myLocks.has(elementId)) {
                releaseLock(elementId, true); // true = auto-release
            }
        }, lockTimeout);
    }, [lockTimeout, myLocks]);

    /**
     * Request a lock on an object
     */
    const requestLock = useCallback((elementId: string) => {
        if (!roomId || !userId) return false;

        // Don't request if already locked by self
        if (myLocks.has(elementId)) {
            // Renew the timeout
            setLockTimeout(elementId);
            return true;
        }

        const lockData = {
            roomId,
            elementId,
            userId,
            username,
            color: userColor
        };

        if (socket && isConnected) {
            socket.emit('request-lock', lockData);
        } else if (queueAction) {
            // Queue for when we're back online
            queueAction('request-lock', lockData);
        }

        return true;
    }, [socket, roomId, userId, username, userColor, myLocks, setLockTimeout, isConnected, queueAction]);

    /**
     * Release a lock on an object
     */

    /**
     * Release all locks held by current user
     */
    const releaseAllLocks = useCallback(() => {
        myLocks.forEach(elementId => {
            releaseLock(elementId);
        });
    }, [myLocks, releaseLock]);

    /**
     * Check if an object is locked
     */
    const isLocked = useCallback((elementId: string): boolean => {
        return !!lockedObjects[elementId];
    }, [lockedObjects]);

    /**
     * Check if an object is locked by current user
     */
    const isLockedByMe = useCallback((elementId: string): boolean => {
        return myLocks.has(elementId);
    }, [myLocks]);

    /**
     * Get lock information for an object
     */
    const getLockInfo = useCallback((elementId: string): LockInfo | null => {
        return lockedObjects[elementId] || null;
    }, [lockedObjects]);

    /**
     * Set up socket listeners for lock events
     */
    useEffect(() => {
        if (!socket) return;

        // Handle lock granted
        const handleLockGranted = ({ elementId, userId: lockUserId, username: lockUsername, color }: any) => {
            setLockedObjects(prev => ({
                ...prev,
                [elementId]: {
                    userId: lockUserId,
                    username: lockUsername,
                    color,
                    timestamp: Date.now(),
                    elementId
                }
            }));

            // If this is our lock, add to myLocks and set timeout
            if (lockUserId === userId) {
                setMyLocks(prev => {
                    const next = new Set(prev);
                    next.add(elementId);
                    return next;
                });
                setLockTimeout(elementId);
            }
        };

        // Handle lock released
        const handleLockReleased = ({ elementId, userId: releaseUserId, isAutoRelease }: any) => {
            setLockedObjects(prev => {
                const next = { ...prev };
                delete next[elementId];
                return next;
            });

            // If this was our lock, remove from myLocks and clear timeout
            if (releaseUserId === userId) {
                setMyLocks(prev => {
                    const next = new Set(prev);
                    next.delete(elementId);
                    return next;
                });
                clearLockTimeout(elementId);
            }
        };

        // Handle lock denied
        const handleLockDenied = ({ elementId, reason }: any) => {
            console.warn(`Lock denied for ${elementId}: ${reason}`);
            // Could show a toast notification here
        };

        // Handle force unlock (by moderator or timeout)
        const handleForceUnlock = ({ elementId, reason }: any) => {
            setLockedObjects(prev => {
                const next = { ...prev };
                delete next[elementId];
                return next;
            });

            // If this was our lock, remove from myLocks
            if (myLocks.has(elementId)) {
                setMyLocks(prev => {
                    const next = new Set(prev);
                    next.delete(elementId);
                    return next;
                });
                clearLockTimeout(elementId);
            }
        };

        socket.on('lock-granted', handleLockGranted);
        socket.on('lock-released', handleLockReleased);
        socket.on('lock-denied', handleLockDenied);
        socket.on('force-unlock', handleForceUnlock);

        return () => {
            socket.off('lock-granted', handleLockGranted);
            socket.off('lock-released', handleLockReleased);
            socket.off('lock-denied', handleLockDenied);
            socket.off('force-unlock', handleForceUnlock);

            // Release all locks on unmount
            releaseAllLocks();

            // Clear all timeouts
            Object.values(lockTimeoutsRef.current).forEach(clearTimeout);
            lockTimeoutsRef.current = {};
        };
    }, [socket, userId, myLocks, setLockTimeout, clearLockTimeout, releaseAllLocks]);

    return {
        lockedObjects,
        myLocks,
        requestLock,
        releaseLock,
        releaseAllLocks,
        isLocked,
        isLockedByMe,
        getLockInfo
    };
}