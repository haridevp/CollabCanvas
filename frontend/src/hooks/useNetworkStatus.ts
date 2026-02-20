import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Interface for queued actions when offline
 */
interface QueuedAction {
    id: string;
    type: string;
    data: any;
    timestamp: number;
}

/**
 * Custom hook for monitoring network status and managing offline queue
 * 
 * @param socket - Socket.io instance
 * @param onReconnect - Callback when connection is restored
 * @returns Network status and queue functions
 */
export function useNetworkStatus(socket: any | null, onReconnect?: () => void) {
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [latency, setLatency] = useState<number>(0);
    const [packetLoss, setPacketLoss] = useState<number>(0);
    const [actionQueue, setActionQueue] = useState<QueuedAction[]>([]);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastPingRef = useRef<number>(0);
    const pingHistoryRef = useRef<number[]>([]);
    const failedPingsRef = useRef<number>(0);
    const totalPingsRef = useRef<number>(0);

    /**
     * Monitor browser online/offline status
     */
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            console.log('Browser is online');
        };

        const handleOffline = () => {
            setIsOnline(false);
            setIsConnected(false);
            console.log('Browser is offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    /**
     * Monitor socket connection status
     */
    useEffect(() => {
        if (!socket) return;

        const handleConnect = () => {
            setIsConnected(true);
            console.log('Socket connected');

            // Trigger reconnection callback
            if (onReconnect) {
                onReconnect();
            }
        };

        const handleDisconnect = (reason: string) => {
            setIsConnected(false);
            console.log(`Socket disconnected: ${reason}`);
        };

        const handleReconnecting = (attempt: number) => {
            console.log(`Reconnecting attempt ${attempt}`);
        };

        const handleReconnect = (attempt: number) => {
            console.log(`Reconnected after ${attempt} attempts`);
        };

        const handleReconnectError = (error: Error) => {
            console.error('Reconnection error:', error);
        };

        const handleReconnectFailed = () => {
            console.error('Reconnection failed');
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('reconnecting', handleReconnecting);
        socket.on('reconnect', handleReconnect);
        socket.on('reconnect_error', handleReconnectError);
        socket.on('reconnect_failed', handleReconnectFailed);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('reconnecting', handleReconnecting);
            socket.off('reconnect', handleReconnect);
            socket.off('reconnect_error', handleReconnectError);
            socket.off('reconnect_failed', handleReconnectFailed);
        };
    }, [socket, onReconnect]);

    /**
     * Ping-pong latency monitoring
     */
    useEffect(() => {
        if (!socket || !isConnected) return;

        const measureLatency = () => {
            const pingId = Date.now();
            lastPingRef.current = pingId;

            socket.emit('ping', { id: pingId }, (response: any) => {
                if (response.id === pingId) {
                    const pongTime = Date.now();
                    const newLatency = pongTime - response.timestamp;

                    // Update ping history (keep last 10)
                    pingHistoryRef.current = [...pingHistoryRef.current.slice(-9), newLatency];

                    // Calculate average latency
                    const avgLatency = pingHistoryRef.current.reduce((a, b) => a + b, 0) / pingHistoryRef.current.length;
                    setLatency(Math.round(avgLatency));

                    // Track successful ping
                    totalPingsRef.current++;
                    failedPingsRef.current = 0;
                }
            });

            // Set timeout for failed ping
            setTimeout(() => {
                const now = Date.now();
                if (lastPingRef.current === pingId) {
                    // Ping failed (no pong received)
                    failedPingsRef.current++;
                    totalPingsRef.current++;

                    // Calculate packet loss percentage
                    const loss = (failedPingsRef.current / totalPingsRef.current) * 100;
                    setPacketLoss(Math.min(100, Math.round(loss)));
                }
            }, 2000); // 2 second timeout
        };

        // Ping every 5 seconds
        pingIntervalRef.current = setInterval(measureLatency, 5000);

        return () => {
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
        };
    }, [socket, isConnected]);

    /**
     * Queue an action for when offline
     */
    const queueAction = useCallback((type: string, data: any) => {
        const action: QueuedAction = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type,
            data,
            timestamp: Date.now()
        };

        setActionQueue(prev => [...prev, action]);
        console.log('Action queued:', action);

        // Store in localStorage for persistence across page reloads
        try {
            const stored = localStorage.getItem('actionQueue');
            const queue = stored ? JSON.parse(stored) : [];
            localStorage.setItem('actionQueue', JSON.stringify([...queue, action]));
        } catch (error) {
            console.error('Failed to store action in localStorage:', error);
        }

        return action.id;
    }, []);

    /**
     * Process queued actions when connection is restored
     */
    const processQueue = useCallback(async () => {
        if (!socket || !isConnected || actionQueue.length === 0 || isSyncing) return;

        setIsSyncing(true);
        console.log(`Processing ${actionQueue.length} queued actions...`);

        // Load from localStorage if queue is empty (page reload case)
        let actionsToProcess = [...actionQueue];
        if (actionsToProcess.length === 0) {
            try {
                const stored = localStorage.getItem('actionQueue');
                if (stored) {
                    actionsToProcess = JSON.parse(stored);
                }
            } catch (error) {
                console.error('Failed to load action queue from localStorage:', error);
            }
        }

        if (actionsToProcess.length === 0) {
            setIsSyncing(false);
            return;
        }

        // Process actions in order
        for (const action of actionsToProcess) {
            try {
                // Add delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 100));

                socket.emit(action.type, {
                    ...action.data,
                    _isReplay: true,
                    _originalTimestamp: action.timestamp
                });

                console.log('Replayed action:', action);
            } catch (error) {
                console.error('Failed to replay action:', action, error);
            }
        }

        // Clear queue after processing
        setActionQueue([]);
        localStorage.removeItem('actionQueue');

        setIsSyncing(false);
        console.log('Queue processing complete');
    }, [socket, isConnected, actionQueue, isSyncing]);

    /**
     * Clear the action queue
     */
    const clearQueue = useCallback(() => {
        setActionQueue([]);
        localStorage.removeItem('actionQueue');
    }, []);

    /**
     * Get queue status
     */
    const getQueueStatus = useCallback(() => {
        return {
            length: actionQueue.length,
            oldest: actionQueue[0]?.timestamp,
            newest: actionQueue[actionQueue.length - 1]?.timestamp
        };
    }, [actionQueue]);

    return {
        isOnline,
        isConnected,
        latency,
        packetLoss,
        actionQueue,
        isSyncing,
        queueAction,
        processQueue,
        clearQueue,
        getQueueStatus
    };
}