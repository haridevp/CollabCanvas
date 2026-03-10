import React, { useState } from 'react';
import { Download, Image as ImageIcon, Code } from 'lucide-react';
import { Modal } from './Modal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'svg', options: { selectionOnly: boolean; includeGrid: boolean; quality: number }) => void;
  hasSelection: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, hasSelection }) => {
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [selectionOnly, setSelectionOnly] = useState<boolean>(false);
  const [includeGrid, setIncludeGrid] = useState<boolean>(false);
  const [quality, setQuality] = useState<number>(1); // Scale multiplier

  const handleExport = () => {
    onExport(format, { selectionOnly: selectionOnly && hasSelection, includeGrid, quality });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Drawing">
      <div className="space-y-6">
        {/* Format Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Format</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormat('png')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                format === 'png'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
            >
              <ImageIcon className="w-5 h-5" />
              <span className="font-medium">PNG Raster</span>
            </button>
            <button
              onClick={() => setFormat('svg')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                format === 'svg'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
            >
              <Code className="w-5 h-5" />
              <span className="font-medium">SVG Vector</span>
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Options</label>
          <div className="space-y-2">
            <label className={`flex items-center gap-3 p-3 rounded-lg border ${hasSelection ? 'border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800' : 'border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed'}`}>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Export Selection Only</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Crop to the boundary of selected items</p>
              </div>
              <input
                type="checkbox"
                disabled={!hasSelection}
                checked={selectionOnly && hasSelection}
                onChange={(e) => setSelectionOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Include Grid Background</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Renders the background dots/grid</p>
              </div>
              <input
                type="checkbox"
                checked={includeGrid}
                onChange={(e) => setIncludeGrid(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Quality (PNG only) */}
        {format === 'png' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Resolution Scale</label>
              <span className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                {quality}x
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Standard (1x)</span>
              <span>Ultra HD (4x)</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Now
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal;
