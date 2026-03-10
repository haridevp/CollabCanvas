import { useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { Sidebar } from '../components/Sidebar';
import {
  Save, Volume2, VolumeX, Clock, Zap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { updateProfile } from '../utils/authService';

/**
 * Interface for user notification preferences
 */
interface NotificationSettings {
  email: boolean;
  push: boolean;
  reminders: boolean;
  marketing: boolean;
  securityAlerts: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  notificationFrequency: 'realtime' | 'daily' | 'weekly';
}

/**
 * Calendar icon component for notification frequency display
 */
const Calendar = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

/**
 * NotificationSettingsPage - Manage notification preferences
 * 
 * Standalone page for controlling notification types, sounds, and frequency.
 * Extracted from the Notifications tab of ProfilePage.
 */
const NotificationSettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: (user as any)?.notificationSettings?.email ?? true,
    push: (user as any)?.notificationSettings?.push ?? false,
    reminders: (user as any)?.notificationSettings?.reminders ?? true,
    marketing: (user as any)?.notificationSettings?.marketing ?? false,
    securityAlerts: (user as any)?.notificationSettings?.securityAlerts ?? true,
    soundEnabled: (user as any)?.notificationSettings?.soundEnabled ?? true,
    desktopNotifications: (user as any)?.notificationSettings?.desktopNotifications ?? false,
    notificationFrequency: (user as any)?.notificationSettings?.notificationFrequency ?? 'realtime'
  });

  const toggleNotification = (key: keyof NotificationSettings): void => {
    if (key === 'notificationFrequency') return;
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleAllNotifications = (enable: boolean): void => {
    setNotifications(prev => ({
      ...prev,
      email: enable,
      push: enable,
      reminders: enable,
      marketing: enable,
      securityAlerts: enable,
      soundEnabled: enable,
      desktopNotifications: enable
    }));
  };

  const handleFrequencyChange = (freq: 'realtime' | 'daily' | 'weekly'): void => {
    setNotifications(prev => ({
      ...prev,
      notificationFrequency: freq
    }));
  };

  const handleSaveChanges = async (): Promise<void> => {
    try {
      const result = await updateProfile({ notificationSettings: notifications }) as any;
      if (result.success) {
        updateUser(result.user);
        alert('Notification settings saved successfully!');
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notification Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Control how and when you receive notifications.
          </p>
        </header>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                  Notification Preferences
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Control how and when you receive notifications
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleAllNotifications(true)}
                  className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Enable All
                </button>
                <button
                  onClick={() => toggleAllNotifications(false)}
                  className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Disable All
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* In-App Notifications */}
              <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                <div>
                  <label htmlFor="in-app-notifications" className="font-semibold text-slate-800 dark:text-white cursor-pointer">In-App Notifications</label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Show notifications within the application
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={notifications.push}
                    onChange={() => toggleNotification('push')}
                    className="sr-only"
                    id="in-app-notifications"
                  />
                  <label
                    htmlFor="in-app-notifications"
                    aria-label="Toggle In-App Notifications"
                    className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${notifications.push ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${notifications.push ? 'transform translate-x-6' : ''}`}></span>
                  </label>
                </div>
              </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                <div>
                  <label htmlFor="email-notifications" className="font-semibold text-slate-800 dark:text-white cursor-pointer">Email Notifications</label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Receive updates about your rooms via email
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={() => toggleNotification('email')}
                    className="sr-only"
                    id="email-notifications"
                  />
                  <label
                    htmlFor="email-notifications"
                    aria-label="Toggle Email Notifications"
                    className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${notifications.email ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${notifications.email ? 'transform translate-x-6' : ''}`}></span>
                  </label>
                </div>
              </div>

              {/* Desktop Notifications */}
              <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                <div>
                  <label htmlFor="desktop-notifications" className="font-semibold text-slate-800 dark:text-white cursor-pointer">Desktop Notifications</label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Show notifications on your desktop
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={notifications.desktopNotifications}
                    onChange={() => toggleNotification('desktopNotifications')}
                    className="sr-only"
                    id="desktop-notifications"
                  />
                  <label
                    htmlFor="desktop-notifications"
                    aria-label="Toggle Desktop Notifications"
                    className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${notifications.desktopNotifications ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${notifications.desktopNotifications ? 'transform translate-x-6' : ''}`}></span>
                  </label>
                </div>
              </div>

              {/* Sound Settings */}
              <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                <div>
                  <label htmlFor="sound-notifications" className="font-semibold text-slate-800 dark:text-white cursor-pointer">Notification Sounds</label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Play sound when receiving notifications
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {notifications.soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-blue-600" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-slate-400" />
                  )}
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notifications.soundEnabled}
                      onChange={() => toggleNotification('soundEnabled')}
                      className="sr-only"
                      id="sound-notifications"
                    />
                    <label
                      htmlFor="sound-notifications"
                      aria-label="Toggle Notification Sounds"
                      className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${notifications.soundEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${notifications.soundEnabled ? 'transform translate-x-6' : ''}`}></span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notification Frequency */}
              <div className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                <div className="mb-3">
                  <p className="font-semibold text-slate-800 dark:text-white">Notification Frequency</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    How often you receive notification summaries
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleFrequencyChange('realtime')}
                    className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${notifications.notificationFrequency === 'realtime'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    <Zap size={16} />
                    Real-time
                  </button>
                  <button
                    onClick={() => handleFrequencyChange('daily')}
                    className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${notifications.notificationFrequency === 'daily'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    <Clock size={16} />
                    Daily Digest
                  </button>
                  <button
                    onClick={() => handleFrequencyChange('weekly')}
                    className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${notifications.notificationFrequency === 'weekly'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    <Calendar size={16} />
                    Weekly Summary
                  </button>
                </div>
              </div>

              {/* Specific Notification Types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-800 dark:text-white">Meeting Reminders</p>
                    <input
                      type="checkbox"
                      checked={notifications.reminders}
                      onChange={() => toggleNotification('reminders')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Get reminders before scheduled meetings
                  </p>
                </div>
                <div className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-800 dark:text-white">Security Alerts</p>
                    <input
                      type="checkbox"
                      checked={notifications.securityAlerts}
                      onChange={() => toggleNotification('securityAlerts')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Important security updates
                  </p>
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

export default NotificationSettingsPage;
