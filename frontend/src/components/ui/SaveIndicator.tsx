import React from 'react';
import { Save, Check, AlertCircle, Clock, Loader } from 'lucide-react';

interface SaveIndicatorProps {
    lastSaveTime: Date | null;
    unsavedChanges: number;
    isSaving: boolean;
    error: Error | null;
    onManualSave?: () => void;
    onToggleAutoSave?: (enabled: boolean) => void;
    isAutoSaveEnabled?: boolean;
    className?: string;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({
    lastSaveTime,
    unsavedChanges,
    isSaving,
    error,
    onManualSave,
    onToggleAutoSave,
    isAutoSaveEnabled = true,
    className = ''
}) => {
    const getStatusIcon = () => {
        if (isSaving) return <Loader size={14} className="text-blue-500 animate-spin" />;
        if (error) return <AlertCircle size={14} className="text-red-500" />;
        if (unsavedChanges > 0) return <Clock size={14} className="text-yellow-500" />;
        return <Check size={14} className="text-green-500" />;
    };

    const getStatusText = () => {
        if (isSaving) return 'Saving...';
        if (error) return `Save failed: ${error.message}`;
        if (unsavedChanges > 0) return `${unsavedChanges} unsaved change${unsavedChanges !== 1 ? 's' : ''}`;
        if (lastSaveTime) {
            const timeAgo = Math.floor((Date.now() - lastSaveTime.getTime()) / 1000);
            if (timeAgo < 60) return `Saved ${timeAgo} second${timeAgo !== 1 ? 's' : ''} ago`;
            if (timeAgo < 3600) return `Saved ${Math.floor(timeAgo / 60)} minute${Math.floor(timeAgo / 60) !== 1 ? 's' : ''} ago`;
            return `Saved at ${lastSaveTime.toLocaleTimeString()}`;
        }
        return 'Not saved yet';
    };

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-sm ${className}`}>
            {/* Status Icon */}
            <div className="flex items-center gap-1.5">
                {getStatusIcon()}
                <span className={`text-xs ${error ? 'text-red-600 dark:text-red-400' :
                    unsavedChanges > 0 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-slate-600 dark:text-slate-400'
                    }`}>
                    {getStatusText()}
                </span>
            </div>

            {/* Auto-save Toggle */}
            {onToggleAutoSave && (
                <button
                    onClick={() => onToggleAutoSave(!isAutoSaveEnabled)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${isAutoSaveEnabled
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    title={isAutoSaveEnabled ? 'Disable auto-save' : 'Enable auto-save'}
                >
                    Auto
                </button>
            )}

            {/* Manual Save Button */}
            {onManualSave && unsavedChanges > 0 && (
                <button
                    onClick={onManualSave}
                    disabled={isSaving}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save now"
                >
                    <Save size={14} className="text-slate-600 dark:text-slate-400" />
                </button>
            )}
        </div>
    );
};