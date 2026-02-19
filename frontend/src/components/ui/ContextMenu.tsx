import React, { useEffect, useRef } from 'react';
import { Copy, Scissors, Clipboard, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onCopy: () => void;
    onCut: () => void;
    onPaste: () => void;
    onDelete: () => void;
    onBringToFront: () => void;
    onSendToBack: () => void;
    hasSelection: boolean;
    hasClipboard: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    onClose,
    onCopy,
    onCut,
    onPaste,
    onDelete,
    onBringToFront,
    onSendToBack,
    hasSelection,
    hasClipboard
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Adjust position to keep menu in viewport
    const adjustedX = Math.min(x, window.innerWidth - 200);
    const adjustedY = Math.min(y, window.innerHeight - 300);

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 py-1 w-48"
            style={{ left: adjustedX, top: adjustedY }}
        >
            {/* Copy */}
            <button
                onClick={() => { onCopy(); onClose(); }}
                disabled={!hasSelection}
                className={`w-full px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
            >
                <Copy size={16} />
                <span>Copy</span>
                <span className="ml-auto text-xs text-slate-400">Ctrl+C</span>
            </button>

            {/* Cut */}
            <button
                onClick={() => { onCut(); onClose(); }}
                disabled={!hasSelection}
                className={`w-full px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
            >
                <Scissors size={16} />
                <span>Cut</span>
                <span className="ml-auto text-xs text-slate-400">Ctrl+X</span>
            </button>

            {/* Paste */}
            <button
                onClick={() => { onPaste(); onClose(); }}
                disabled={!hasClipboard}
                className={`w-full px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${!hasClipboard ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
            >
                <Clipboard size={16} />
                <span>Paste</span>
                <span className="ml-auto text-xs text-slate-400">Ctrl+V</span>
            </button>

            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

            {/* Delete */}
            <button
                onClick={() => { onDelete(); onClose(); }}
                disabled={!hasSelection}
                className={`w-full px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-red-600 dark:text-red-400 ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
            >
                <Trash2 size={16} />
                <span>Delete</span>
                <span className="ml-auto text-xs text-slate-400">Del</span>
            </button>

            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

            {/* Layer controls */}
            <button
                onClick={() => { onBringToFront(); onClose(); }}
                disabled={!hasSelection}
                className={`w-full px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
            >
                <ArrowUp size={16} />
                <span>Bring to Front</span>
            </button>
            <button
                onClick={() => { onSendToBack(); onClose(); }}
                disabled={!hasSelection}
                className={`w-full px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
            >
                <ArrowDown size={16} />
                <span>Send to Back</span>
            </button>
        </div>
    );
};