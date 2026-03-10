import { render, screen } from '@testing-library/react';
import { CollaborativeCanvas } from '../../../features/canvas/CollaborativeCanvas';
import { BrowserRouter } from 'react-router-dom';
import { vi, expect, describe, it } from 'vitest';

// Stable mock values to prevent infinite render loops
const mockElements: any[] = [];
const mockSelection = { selectedIds: [], isMultiSelect: false };
const mockTransform = { isTransforming: false, type: null, startBox: null, currentBox: null };
const mockLayerState = { 
  layers: [{ id: '1', name: 'Layer 1', visible: true, locked: false, opacity: 1, index: 0, elementIds: [] }], 
  activeLayerId: '1' 
};
const mockUser = { id: 'test-user', username: 'testuser' };
const mockActionQueue: any[] = [];
const mockLockedObjects = {};
const mockMyLocks: any[] = [];
const mockQueueStatus = {};

// Mock AuthContext
vi.mock('../../../services/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    token: 'test-token'
  })
}));

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    off: vi.fn(),
    connected: true
  }))
}));

// Mock custom hooks with stable return values
vi.mock('../../../hooks/useUndoRedo', () => ({
  useUndoRedo: () => ({
    present: mockElements,
    setState: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    replaceState: vi.fn()
  })
}));

vi.mock('../../../hooks/useSelection', () => ({
  useSelection: () => ({
    selection: mockSelection,
    setSelection: vi.fn(),
    transform: mockTransform,
    dragBox: null,
    handleSelectionStart: vi.fn(),
    handleDragBox: vi.fn(),
    handleSelectionEnd: vi.fn(),
    startMove: vi.fn(),
    startResize: vi.fn(),
    handleTransform: vi.fn(),
    endTransform: vi.fn(),
    clearSelection: vi.fn(),
    deleteSelected: vi.fn(),
    duplicateSelected: vi.fn(),
    bringToFront: vi.fn(),
    sendToBack: vi.fn()
  })
}));

vi.mock('../../../hooks/useClipboard', () => ({
  useClipboard: () => ({
    copyToClipboard: vi.fn(),
    cutToClipboard: vi.fn(),
    pasteFromClipboard: vi.fn(),
    hasClipboardContent: vi.fn(() => false)
  })
}));

vi.mock('../../../hooks/useLayers', () => ({
  useLayers: () => ({
    layerState: mockLayerState,
    createLayer: vi.fn(),
    deleteLayer: vi.fn(),
    duplicateLayer: vi.fn(),
    toggleLayerVisibility: vi.fn(),
    toggleLayerLock: vi.fn(),
    setActiveLayer: vi.fn(),
    renameLayer: vi.fn(),
    setLayerOpacity: vi.fn(),
    setLayerBlendMode: vi.fn(),
    reorderLayers: vi.fn(),
    mergeLayerDown: vi.fn(),
    getLayerElements: vi.fn(() => mockElements),
    isLayerEditable: vi.fn(() => true),
    updateLayerElementCounts: vi.fn(),
    setLayerState: vi.fn()
  })
}));

vi.mock('../../../hooks/useObjectLocks', () => ({
  useObjectLocks: () => ({
    lockedObjects: mockLockedObjects,
    myLocks: mockMyLocks,
    requestLock: vi.fn(),
    releaseLock: vi.fn(),
    isLocked: vi.fn(() => false),
    isLockedByMe: vi.fn(() => true),
    getLockInfo: vi.fn()
  })
}));

vi.mock('../../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    isConnected: true,
    latency: 0,
    packetLoss: 0,
    actionQueue: mockActionQueue,
    isSyncing: false,
    queueAction: vi.fn(),
    processQueue: vi.fn(),
    clearQueue: vi.fn(),
    getQueueStatus: vi.fn(() => mockQueueStatus)
  })
}));

vi.mock('../../../hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    lastSaveTime: null,
    isSaving: false,
    manualSave: vi.fn(),
    resetTimer: vi.fn(),
    unsavedChanges: false,
    isAutoSaveEnabled: true,
    toggleAutoSave: vi.fn()
  })
}));

// Mock all utilities
vi.mock('../../../utils/svgExport', () => ({ elementsToSVG: vi.fn() }));
vi.mock('../../../utils/toolIcons', () => ({ 
  getToolIcon: () => (props: any) => <div {...props} />, 
  getToolLabel: (t: string) => t, 
  getToolColor: () => '#000' 
}));
vi.mock('../../../utils/magicWand', () => ({ performMagicWandSelection: vi.fn() }));
vi.mock('../../../utils/shapeRecognition', () => ({ recognizeShape: vi.fn(), recognizeGesture: vi.fn() }));
vi.mock('../../../utils/payloadCompression', () => ({ compressDrawingData: vi.fn(), decompressDrawingData: vi.fn(), shouldCompress: vi.fn() }));
vi.mock('../../../utils/viewportCulling', () => ({ getVisibleElements: (e: any) => e, getViewportStats: vi.fn() }));
vi.mock('../../../utils/spatialIndex', () => ({ SpatialIndex: class { insert = vi.fn(); remove = vi.fn(); queryPoint = vi.fn(() => []); clear = vi.fn(); getStats = vi.fn(() => ({})); } }));
vi.mock('../../../utils/geometry', () => ({ isPointInElement: vi.fn() }));

// Mock lucide-react with all necessary icons
vi.mock('lucide-react', () => ({
  MousePointer: () => <div />, Pencil: () => <div />, Square: () => <div />, Circle: () => <div />, Triangle: () => <div />, 
  Minus: () => <div />, ArrowRight: () => <div />, Type: () => <div />, Eraser: () => <div />, Image: () => <div />,
  Move: () => <div />, Edit2: () => <div />, Trash2: () => <div />, Grid: () => <div />, Plus: () => <div />,
  X: () => <div />, Lock: () => <div />, MinusCircle: () => <div />, PlusCircle: () => <div />, Zap: () => <div />,
  ZapOff: () => <div />, Download: () => <div />, RotateCcw: () => <div />, RotateCw: () => <div />, Copy: () => <div />,
  Scissors: () => <div />, ArrowUp: () => <div />, ArrowDown: () => <div />, Trash: () => <div />, Clipboard: () => <div />,
  Keyboard: () => <div />, Palette: () => <div />, Brush: () => <div />, Highlighter: () => <div />, SprayCan: () => <div />
}));

// Mock sub-components with CORRECT paths
vi.mock('../../../components/ui/ColorPicker', () => ({ default: () => <div data-testid="color-picker" /> }));
vi.mock('../../../components/ui/BrushSettings', () => ({ default: () => <div data-testid="brush-settings" /> }));
vi.mock('../../../components/ui/TextEditor', () => ({ default: () => <div data-testid="text-editor" /> }));
vi.mock('../../../components/ui/ImageUploader', () => ({ default: () => <div data-testid="image-uploader" /> }));
vi.mock('../../../components/ui/ContextMenu', () => ({ ContextMenu: () => <div data-testid="context-menu" /> }));
vi.mock('../../../components/ui/ExportModal', () => ({ default: () => <div data-testid="export-modal" /> }));
vi.mock('../../../components/ui/LayerPanel', () => ({ LayerPanel: () => <div data-testid="layer-panel" /> }));
vi.mock('../../../components/ui/NetworkStatus', () => ({ NetworkStatus: () => <div data-testid="network-status" /> }));
vi.mock('../../../components/ui/SaveIndicator', () => ({ SaveIndicator: () => <div data-testid="save-indicator" /> }));
vi.mock('../../../components/canvas/Toolbar', () => ({ default: () => <div data-testid="toolbar" role="toolbar" /> }));
vi.mock('../../../components/canvas/ZoomControls', () => ({ default: () => <div data-testid="zoom-controls" /> }));

// Mock ResizeObserver which is missing in JSDOM
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

describe('CollaborativeCanvas', () => {
  it('renders without crashing', () => {
    console.log('Test: renders without crashing START');
    render(
      <BrowserRouter>
        <CollaborativeCanvas roomId="test-room" />
      </BrowserRouter>
    );
    console.log('Test: renders without crashing END');
    
    // Check if toolbar is rendered (manually mocked above)
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('shows canvas correctly', () => {
    console.log('Test: shows canvas correctly START');
    render(
      <BrowserRouter>
        <CollaborativeCanvas roomId="test-room" />
      </BrowserRouter>
    );
    console.log('Test: shows canvas correctly END');

    // Verify canvas is present
    const canvas = screen.getByLabelText(/Collaborative drawing canvas/i);
    expect(canvas).toBeInTheDocument();
  });
});
