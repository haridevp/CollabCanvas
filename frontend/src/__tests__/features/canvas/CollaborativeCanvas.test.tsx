import { render, screen } from '@testing-library/react';
import { CollaborativeCanvas } from '../../../features/canvas/CollaborativeCanvas';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';

// ─── Module-level mocks ──────────────────────────────────────────────────────
// CRITICAL: All hook mocks must return STABLE object references, not new objects
// per call. vi.fn() inside the returned function creates new references on each
// React render, which breaks useEffect dependency arrays and causes infinite loops.

const MOCK_USER = { id: 'test-user', username: 'testuser', _id: 'test-user', fullName: 'Test User' };
const MOCK_AUTH = { user: MOCK_USER };

vi.mock('../../../services/AuthContext', () => ({
  useAuth: () => MOCK_AUTH,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
    connected: false,
    id: 'mock-socket-id',
  };
  return { io: vi.fn(() => mockSocket) };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ roomId: 'test-room' }),
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Stable singleton return values for hooks
const MOCK_AUTOSAVE = {
  lastSaveTime: null,
  isAutoSaveEnabled: false,
  toggleAutoSave: vi.fn(),
  manualSave: vi.fn(),
  unsavedChanges: false,
  isSaving: false,
  lastError: null,
  resetTimer: vi.fn(),
};
vi.mock('../../../hooks/useAutoSave', () => ({
  useAutoSave: () => MOCK_AUTOSAVE,
}));

const MOCK_NETWORK = {
  isOnline: true,
  isConnected: true,
  latency: 0,
  packetLoss: 0,
  actionQueue: [] as any[],
  isSyncing: false,
  queueAction: vi.fn(),
  processQueue: vi.fn(),
  clearQueue: vi.fn(),
  getQueueStatus: vi.fn(() => ({ length: 0 })),
};
vi.mock('../../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => MOCK_NETWORK,
}));

const MOCK_LOCKS = {
  lockedObjects: {},
  myLocks: [] as any[],
  requestLock: vi.fn(),
  releaseLock: vi.fn(),
  isLocked: vi.fn(() => false),
  isLockedByMe: vi.fn(() => false),
  getLockInfo: vi.fn(() => null),
};
vi.mock('../../../hooks/useObjectLocks', () => ({
  useObjectLocks: () => MOCK_LOCKS,
}));

const MOCK_UNDO_REDO = {
  present: [] as any[],
  setState: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: false,
  canRedo: false,
  replaceState: vi.fn(),
};
vi.mock('../../../hooks/useUndoRedo', () => ({
  useUndoRedo: () => MOCK_UNDO_REDO,
}));

const MOCK_SELECTION = {
  selection: { selectedIds: [] as string[], isMultiSelect: false },
  setSelection: vi.fn(),
  transform: { isTransforming: false, transformType: 'none' as const },
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
  sendToBack: vi.fn(),
  findElementAtPoint: vi.fn(() => null),
};
vi.mock('../../../hooks/useSelection', () => ({
  useSelection: () => MOCK_SELECTION,
}));

const MOCK_CLIPBOARD = {
  copy: vi.fn(),
  cut: vi.fn(),
  paste: vi.fn(),
  hasClipboard: false,
};
vi.mock('../../../hooks/useClipboard', () => ({
  useClipboard: () => MOCK_CLIPBOARD,
}));

const MOCK_LAYERS = {
  layerState: {
    layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'normal', elementCount: 0 }],
    activeLayerId: 'layer-1',
  },
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  setActiveLayer: vi.fn(),
  toggleLayerVisibility: vi.fn(),
  toggleLayerLock: vi.fn(),
  setLayerOpacity: vi.fn(),
  setLayerBlendMode: vi.fn(),
  reorderLayers: vi.fn(),
  renameLayer: vi.fn(),
  isLayerEditable: vi.fn(() => true),
  getLayerElements: vi.fn(() => []),
  duplicateLayer: vi.fn(),
  mergeLayerDown: vi.fn(),
  updateLayerElementCounts: vi.fn(),
};
vi.mock('../../../hooks/useLayers', () => ({
  useLayers: () => MOCK_LAYERS,
}));

vi.mock('../../../utils/payloadCompression', () => ({
  compressDrawingData: vi.fn((data: any) => data),
  decompressDrawingData: vi.fn((data: any) => data),
  shouldCompress: vi.fn(() => false),
}));

// ─── Global stubs ────────────────────────────────────────────────────────────

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', vi.fn((_cb: () => void) => 0));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  global.ResizeObserver = class {
    observe() { }
    unobserve() { }
    disconnect() { }
  };

  // Proxy canvas context: auto-stubs any method
  const ctx = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'canvas') return document.createElement('canvas');
      if (prop === 'measureText') return vi.fn(() => ({ width: 50 }));
      if (prop === 'getImageData') return vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }));
      return vi.fn();
    },
  });
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(ctx);
  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,');
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb: (b: Blob) => void) => cb(new Blob()));

  global.Image = class {
    onload: (() => void) | null = null;
    src = '';
    complete = true;
    naturalWidth = 100;
    naturalHeight = 100;
    width = 100;
    height = 100;
  } as any;
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CollaborativeCanvas', () => {
  const renderCanvas = () =>
    render(
      <BrowserRouter>
        <CollaborativeCanvas roomId="test-room" />
      </BrowserRouter>
    );

  it('renders without crashing', () => {
    renderCanvas();
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
    expect(screen.getByLabelText(/collaborative drawing canvas/i)).toBeInTheDocument();
  });

  it('shows toolbar buttons', () => {
    renderCanvas();
    expect(screen.getByLabelText(/pencil tool/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rectangle tool/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/circle tool/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/eraser tool/i)).toBeInTheDocument();
  });
});