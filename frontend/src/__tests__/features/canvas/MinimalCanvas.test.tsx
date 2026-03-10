import { render } from '@testing-library/react';
import { CollaborativeCanvas } from '../../../features/canvas/CollaborativeCanvas';
import { BrowserRouter } from 'react-router-dom';
import { vi, expect, describe, it } from 'vitest';

// Stable mock values to prevent infinite render loops
const mockElements: any[] = [];
const mockSelection = { selectedIds: [], isMultiSelect: false };
const mockLayerState = { layers: [{ id: 'layer-1', name: 'Background', visible: true, locked: false, opacity: 1, index: 0, elementIds: [] }], activeLayerId: 'layer-1' };
const mockBrushConfig = { minWidth: 1, maxWidth: 10, pressureSensitive: true, smoothing: 0.7, antiAliasing: true };
const mockUser = { id: '1', username: 'testuser' };
const mockActionQueue: any[] = [];

// Minimal Mocks
vi.mock('../../../services/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), off: vi.fn(), connected: true }))
}));

// Mock all hooks with stable return values
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
    transform: { isTransforming: false }, 
    dragBox: null, 
    clearSelection: vi.fn() 
  }) 
}));

vi.mock('../../../hooks/useClipboard', () => ({ 
  useClipboard: () => ({ 
    copyToClipboard: vi.fn(), 
    cutToClipboard: vi.fn(), 
    pasteFromClipboard: vi.fn(), 
    hasClipboardContent: () => false 
  }) 
}));

vi.mock('../../../hooks/useLayers', () => ({ 
  useLayers: () => ({ 
    layerState: mockLayerState, 
    createLayer: vi.fn(),
    isLayerEditable: () => true,
    getLayerElements: () => []
  }) 
}));

vi.mock('../../../hooks/useObjectLocks', () => ({ 
  useObjectLocks: () => ({ 
    lockedObjects: {}, 
    isLocked: () => false, 
    isLockedByMe: () => false,
    releaseLock: vi.fn(),
    requestLock: vi.fn()
  }) 
}));

vi.mock('../../../hooks/useNetworkStatus', () => ({ 
  useNetworkStatus: () => ({ 
    isConnected: true, 
    isOnline: true, 
    latency: 0, 
    packetLoss: 0, 
    actionQueue: mockActionQueue, 
    isSyncing: false 
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
vi.mock('../../../utils/toolIcons', () => ({ getToolIcon: () => () => <div />, getToolLabel: (t: string) => t, getToolColor: () => '#000' }));
vi.mock('../../../utils/magicWand', () => ({ performMagicWandSelection: vi.fn() }));
vi.mock('../../../utils/shapeRecognition', () => ({ recognizeShape: vi.fn(), recognizeGesture: vi.fn() }));
vi.mock('../../../utils/payloadCompression', () => ({ compressDrawingData: vi.fn(), decompressDrawingData: vi.fn(), shouldCompress: vi.fn() }));
vi.mock('../../../utils/viewportCulling', () => ({ getVisibleElements: (e: any) => e, getViewportStats: vi.fn() }));
vi.mock('../../../utils/spatialIndex', () => ({ SpatialIndex: class { insert = vi.fn(); remove = vi.fn(); queryPoint = vi.fn(() => []); clear = vi.fn(); getStats = vi.fn(() => ({})); } }));
vi.mock('../../../utils/geometry', () => ({ isPointInElement: vi.fn() }));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Square: () => <div />, Circle: () => <div />, Triangle: () => <div />, Edit2: () => <div />, 
  Trash2: () => <div />, Grid: () => <div />, Minus: () => <div />, Plus: () => <div />, 
  X: () => <div />, Lock: () => <div />, Eraser: () => <div />, MinusCircle: () => <div />, 
  PlusCircle: () => <div />, Zap: () => <div />, ZapOff: () => <div />, Download: () => <div />, 
  RotateCcw: () => <div />, RotateCw: () => <div />, Type: () => <div />, Move: () => <div />, 
  Copy: () => <div />, Scissors: () => <div />, ArrowUp: () => <div />, ArrowDown: () => <div />, 
  Trash: () => <div />, Clipboard: () => <div />, Keyboard: () => <div />, ArrowRight: () => <div />,
  Image: () => <div />
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock sub-components
vi.mock('../../components/ui/ColorPicker', () => ({ default: () => <div /> }));
vi.mock('../../components/ui/BrushSettings', () => ({ default: () => <div /> }));
vi.mock('../../components/ui/TextEditor', () => ({ default: () => <div /> }));
vi.mock('../../components/ui/ImageUploader', () => ({ default: () => <div /> }));
vi.mock('../../components/ui/ContextMenu', () => ({ ContextMenu: () => <div /> }));
vi.mock('../../components/ui/ExportModal', () => ({ default: () => <div /> }));
vi.mock('../../components/ui/LayerPanel', () => ({ LayerPanel: () => <div /> }));
vi.mock('../../components/ui/NetworkStatus', () => ({ NetworkStatus: () => <div /> }));
vi.mock('../../components/ui/SaveIndicator', () => ({ SaveIndicator: () => <div /> }));
vi.mock('../../components/canvas/Toolbar', () => ({ default: () => <div /> }));
vi.mock('../../components/canvas/ZoomControls', () => ({ default: () => <div /> }));


describe('MinimalCanvas', () => {
  it('renders', () => {
    console.log('Starting minimal render test');
    try {
      render(
        <BrowserRouter>
          <CollaborativeCanvas roomId="test" />
        </BrowserRouter>
      );
      console.log('Render call completed');
    } catch (err: any) {
      console.error('Render CRASHED:', err.message);
      console.error(err.stack);
    }
    expect(true).toBe(true);
  });
});
