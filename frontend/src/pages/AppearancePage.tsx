import { useState } from 'react';
import ThemeSelector from '../components/ui/ThemeSelector';
import { useAuth } from '../services/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { Save } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { updateProfile } from '../utils/authService';
import { applyTheme, getStoredTheme, setStoredTheme } from '../utils/theme';

/**
 * AppearancePage - Theme and display customization
 * 
 * Standalone page for managing theme preferences.
 * Extracted from the Appearance tab of ProfilePage.
 */
const AppearancePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [theme, setTheme] = useState<'light' | 'dark' | 'system' | 'high-contrast'>(() => {
    return (user?.theme as any) || (getStoredTheme() as any) || 'system';
  });

  /**
   * Handles theme change and applies it globally
   */
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system' | 'high-contrast'): void => {
    setTheme(newTheme);

    if (updateUser) {
      updateUser({ theme: newTheme });
    }

    setStoredTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleSaveChanges = async (): Promise<void> => {
    try {
      const result = await updateProfile({ theme }) as any;

      if (result.success) {
        updateUser(result.user);
        alert('Appearance settings saved successfully!');
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Appearance</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Customize how the application looks. Changes apply immediately.
          </p>
        </header>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">
                Theme & Display
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Choose your preferred color scheme.
              </p>
            </div>

            <ThemeSelector
              currentTheme={theme}
              onThemeChange={handleThemeChange}
            />
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

export default AppearancePage;
