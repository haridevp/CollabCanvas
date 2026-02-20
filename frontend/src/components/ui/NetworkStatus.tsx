import React from 'react';
import { Wifi, WifiOff, Activity, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface NetworkStatusProps {
    isOnline: boolean;
    isConnected: boolean;
    latency: number;
    packetLoss: number;
    queueLength: number;
    isSyncing: boolean;
    onRetry?: () => void;
    onSync?: () => void; // Add this prop for sync button
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
    isOnline,
    isConnected,
    latency,
    packetLoss,
    queueLength,
    isSyncing,
    onRetry,
    onSync
}) => {
    const getConnectionColor = () => {
        if (!isOnline) return 'text-red-500';
        if (!isConnected) return 'text-yellow-500';
        if (packetLoss > 10) return 'text-yellow-500';
        if (latency > 300) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getConnectionIcon = () => {
        if (!isOnline) return <WifiOff size={16} />;
        if (!isConnected) return <WifiOff size={16} />;
        return <Wifi size={16} />;
    };

    const getLatencyColor = () => {
        if (latency < 100) return 'text-green-500';
        if (latency < 300) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2 z-50">
            <div className="flex items-center gap-3">
                {/* Connection Status */}
                <div className="flex items-center gap-1.5">
                    <div className={getConnectionColor()}>
                        {getConnectionIcon()}
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {!isOnline ? 'Offline' : !isConnected ? 'Disconnected' : 'Connected'}
                    </span>
                </div>

                {/* Latency */}
                {isConnected && (
                    <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-500" />
                        <span className={`text-xs font-mono ${getLatencyColor()}`}>
                            {latency}ms
                        </span>
                    </div>
                )}

                {/* Packet Loss */}
                {isConnected && packetLoss > 0 && (
                    <div className="flex items-center gap-1.5">
                        <Activity size={14} className="text-slate-500" />
                        <span className={`text-xs font-mono ${packetLoss > 10 ? 'text-red-500' : 'text-yellow-500'
                            }`}>
                            {packetLoss}% loss
                        </span>
                    </div>
                )}

                {/* Queue Indicator */}
                {queueLength > 0 && (
                    <div className="flex items-center gap-1.5">
                        {isSyncing ? (
                            <RefreshCw size={14} className="text-blue-500 animate-spin" />
                        ) : (
                            <AlertCircle size={14} className="text-yellow-500" />
                        )}
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                            {queueLength} {queueLength === 1 ? 'action' : 'actions'} queued
                        </span>
                    </div>
                )}

                {/* Sync Button - appears when there are queued actions and we're connected */}
                {queueLength > 0 && !isSyncing && isConnected && onSync && (
                    <button
                        onClick={onSync}
                        className="ml-2 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                        Sync Now
                    </button>
                )}

                {/* Retry Button */}
                {!isConnected && onRetry && (
                    <button
                        onClick={onRetry}
                        className="ml-2 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                        Retry
                    </button>
                )}
            </div>

            {/* Sync Progress Bar */}
            {isSyncing && (
                <div className="mt-2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 animate-pulse"
                        style={{ width: '100%' }}
                    />
                </div>
            )}
        </div>
    );
};