import React, { useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown as MergeDown,
  Edit2,
  Check,
  X
} from 'lucide-react';
import type { Layer } from '../../types/canvas';

/**
 * Props for the LayerPanel component
 */
interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  isExpanded: boolean;
  panelWidth: number;
  totalElements: number;
  onToggleExpand: () => void;
  onResize: (width: number) => void;
  onCreateLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onSelectLayer: (layerId: string) => void;
  onRenameLayer: (layerId: string, newName: string) => void;
  onMergeDown: (layerId: string) => void;
  onReorderLayers: (sourceIndex: number, targetIndex: number) => void;
}

/**
 * LayerPanel Component
 * 
 * @component
 * @description
 * A panel for managing layers in the drawing application.
 * Supports layer visibility, locking, reordering, renaming, and more.
 */
export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  isExpanded,
  panelWidth,
  totalElements,
  onToggleExpand,
  onResize,
  onCreateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onToggleVisibility,
  onToggleLock,
  onSelectLayer,
  onRenameLayer,
  onMergeDown,
  onReorderLayers
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);
  const [dragOverLayerIndex, setDragOverLayerIndex] = useState<number | null>(null);

  // Sort layers by index (lower index = bottom)
  const sortedLayers = [...layers].sort((a, b) => a.index - b.index);

  /**
   * Handle resize mouse down
   */
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleResizeMove = (moveEvent: MouseEvent) => {
      const diff = startX - moveEvent.clientX;
      const newWidth = Math.max(200, Math.min(400, startWidth - diff));
      onResize(newWidth);
    };

    const handleResizeUp = () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeUp);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeUp);
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLayerIndex(index);
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLayerIndex(index);
  };

  /**
   * Handle drop
   */
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      onReorderLayers(sourceIndex, targetIndex);
    }
    setDraggedLayerIndex(null);
    setDragOverLayerIndex(null);
  };

  /**
   * Start renaming layer
   */
  const startRenaming = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  /**
   * Save renamed layer
   */
  const saveRename = () => {
    if (editingLayerId && editingName.trim()) {
      onRenameLayer(editingLayerId, editingName.trim());
    }
    setEditingLayerId(null);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={onToggleExpand}
        className="absolute right-4 top-20 z-30 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        title="Show Layers"
      >
        <Layers size={20} className="text-slate-600 dark:text-slate-400" />
      </button>
    );
  }

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-30 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex"
      style={{ width: panelWidth }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/50 transition-colors"
        onMouseDown={handleResizeStart}
      />

      {/* Panel content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-slate-600 dark:text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Layers</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onCreateLayer}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="New Layer"
            >
              <Plus size={16} className="text-slate-600 dark:text-slate-400" />
            </button>
            <button
              onClick={onToggleExpand}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Hide Layers"
            >
              <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Layer list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sortedLayers.map((layer, index) => (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => {
                setDraggedLayerIndex(null);
                setDragOverLayerIndex(null);
              }}
              className={`group relative p-2 rounded-lg transition-all ${
                activeLayerId === layer.id
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              } ${
                draggedLayerIndex === index ? 'opacity-50' : ''
              } ${
                dragOverLayerIndex === index ? 'border-t-2 border-blue-500' : ''
              }`}
              style={{ cursor: 'grab' }}
            >
              {/* Layer color indicator */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
                style={{ backgroundColor: layer.color }}
              />

              <div className="flex items-center gap-2 ml-2">
                {/* Visibility toggle */}
                <button
                  onClick={() => onToggleVisibility(layer.id)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {layer.visible ? (
                    <Eye size={14} className="text-slate-600 dark:text-slate-400" />
                  ) : (
                    <EyeOff size={14} className="text-slate-400 dark:text-slate-600" />
                  )}
                </button>

                {/* Lock toggle */}
                <button
                  onClick={() => onToggleLock(layer.id)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                >
                  {layer.locked ? (
                    <Lock size={14} className="text-slate-600 dark:text-slate-400" />
                  ) : (
                    <Unlock size={14} className="text-slate-400 dark:text-slate-600" />
                  )}
                </button>

                {/* Layer name */}
                <div
                  onClick={() => onSelectLayer(layer.id)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  {editingLayerId === layer.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename();
                          if (e.key === 'Escape') setEditingLayerId(null);
                        }}
                        className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-slate-800 border border-blue-500 rounded focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={saveRename}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded text-green-600"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => setEditingLayerId(null)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                        {layer.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({layer.elementIds.length})
                      </span>
                    </div>
                  )}
                </div>

                {/* Layer actions (shown on hover) */}
                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={() => startRenaming(layer)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                    title="Rename Layer"
                  >
                    <Edit2 size={12} className="text-slate-500" />
                  </button>
                  <button
                    onClick={() => onDuplicateLayer(layer.id)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                    title="Duplicate Layer"
                  >
                    <Copy size={12} className="text-slate-500" />
                  </button>
                  {index > 0 && (
                    <button
                      onClick={() => onMergeDown(layer.id)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Merge Down"
                    >
                      <MergeDown size={12} className="text-slate-500" />
                    </button>
                  )}
                  {layers.length > 1 && (
                    <button
                      onClick={() => onDeleteLayer(layer.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete Layer"
                    >
                      <Trash2 size={12} className="text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer with layer stats */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
          {layers.length} layer{layers.length !== 1 ? 's' : ''} • 
          {totalElements} object{totalElements !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};