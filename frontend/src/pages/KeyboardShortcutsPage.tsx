import { useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { Save, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { updateProfile } from '../utils/authService';

/**
 * Interface for keyboard shortcut configuration
 */
interface KeyboardShortcuts {
  [key: string]: string;
  undo: string;
  redo: string;
  brush: string;
  eraser: string;
  select: string;
  pan: string;
  zoomIn: string;
  zoomOut: string;
  save: string;
}

/**
 * Provides description for keyboard shortcuts
 */
const getShortcutDescription = (action: string): string => {
  const descriptions: Record<string, string> = {
    undo: 'Revert the last action',
    redo: 'Restore the last undone action',
    brush: 'Switch to brush tool',
    eraser: 'Switch to eraser tool',
    select: 'Switch to selection tool',
    pan: 'Switch to hand/pan tool',
    zoomIn: 'Zoom in on canvas',
    zoomOut: 'Zoom out of canvas',
    save: 'Save current work'
  };
  return descriptions[action] || 'Custom shortcut';
};

/**
 * KeyboardShortcutsPage - Customize keyboard shortcuts
 * 
 * Standalone page for editing and managing keyboard shortcut bindings.
 * Extracted from the Keyboard Shortcuts tab of ProfilePage.
 */
const KeyboardShortcutsPage: React.FC = () => {
  const { updateUser } = useAuth();

  const [keyboardShortcuts, setKeyboardShortcuts] = useState<KeyboardShortcuts>({
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    brush: 'B',
    eraser: 'E',
    select: 'V',
    pan: 'H',
    zoomIn: 'Ctrl++',
    zoomOut: 'Ctrl+-',
    save: 'Ctrl+S'
  });
  const [shortcutConflict, setShortcutConflict] = useState<string | null>(null);

  const handleShortcutChange = (action: string, shortcut: string): void => {
    const conflicts = Object.entries(keyboardShortcuts)
      .filter(([key, value]) => key !== action && value === shortcut)
      .map(([key]) => key);

    if (conflicts.length > 0) {
      setShortcutConflict(`Conflict with ${conflicts.join(', ')}`);
    } else {
      setShortcutConflict(null);
    }

    setKeyboardShortcuts(prev => ({
      ...prev,
      [action]: shortcut
    }));
  };

  const resetShortcutsToDefault = (): void => {
    setKeyboardShortcuts({
      undo: 'Ctrl+Z',
      redo: 'Ctrl+Y',
      brush: 'B',
      eraser: 'E',
      select: 'V',
      pan: 'H',
      zoomIn: 'Ctrl++',
      zoomOut: 'Ctrl+-',
      save: 'Ctrl+S'
    });
    setShortcutConflict(null);
  };

  const handleSaveChanges = async (): Promise<void> => {
    try {
      const result = await updateProfile({ keyboardShortcuts }) as any;
      if (result.success) {
        updateUser(result.user);
        alert('Keyboard shortcuts saved successfully!');
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('An error occurred while saving.');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Customize keyboard shortcuts for faster drawing workflow.
          </p>
        </header>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">
                Keyboard Shortcuts Customization
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Edit shortcut bindings to match your workflow. These shortcuts are active when working on the canvas.
              </p>
            </div>

            {/* Conflict Warning */}
            {shortcutConflict && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                  <AlertTriangle size={18} />
                  <span className="font-medium">{shortcutConflict}</span>
                </div>
              </div>
            )}

            {/* Shortcuts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(keyboardShortcuts).map(([action, shortcut]) => (
                <div key={action} className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium text-slate-800 dark:text-white capitalize">
                      {action.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <input
                      type="text"
                      value={shortcut}
                      onChange={(e) => handleShortcutChange(action, e.target.value)}
                      className="px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-center font-mono w-32"
                      placeholder="Shortcut"
                    />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {getShortcutDescription(action)}
                  </p>
                </div>
              ))}
            </div>

            {/* Reset Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={resetShortcutsToDefault}
                className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <Settings size={16} />
                Reset to Defaults
              </button>
            </div>

            {/* Shortcut Legend */}
            <div className="mt-8 p-6 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <h4 className="font-semibold text-slate-800 dark:text-white mb-4">
                Shortcut Legend
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <kbd className="inline-block px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm font-mono">
                    Ctrl
                  </kbd>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Control key</p>
                </div>
                <div className="text-center">
                  <kbd className="inline-block px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm font-mono">
                    Shift
                  </kbd>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Shift key</p>
                </div>
                <div className="text-center">
                  <kbd className="inline-block px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm font-mono">
                    Alt
                  </kbd>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alt/Option key</p>
                </div>
                <div className="text-center">
                  <kbd className="inline-block px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm font-mono">
                    Space
                  </kbd>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Space bar</p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Changes Button */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <Button onClick={handleSaveChanges} className="gap-2">
              <Save size={18} /> Save Changes
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default KeyboardShortcutsPage;
