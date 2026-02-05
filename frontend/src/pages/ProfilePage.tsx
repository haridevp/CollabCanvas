import { useState, useEffect } from 'react';
import ThemeSelector from '../components/ui/ThemeSelector';
import CharacterCounter from '../components/ui/CharacterCounter';
import FileUpload from '../components/ui/FileUpload';
import ImageCropper from '../components/ui/ImageCropper';
import { useAuth } from '../services/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { 
  User, Shield, Bell, Palette, Camera, Save, Trash2, AlertTriangle, 
  Lock, Key, X, Check, Sun, Moon, Monitor, Contrast, Keyboard,
  Mail, Volume2, VolumeX, Clock, Zap, Settings, Eye, EyeOff
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import DeletionSurveyModal from '../components/DeletionSurveyModal';
import { 
  requestAccountDeletion, 
  hasPendingDeletion, 
  getPendingDeletion, 
  cancelAccountDeletion, 
  clearUserData 
} from '../services/accountDeletionService';
// Import the profile update service
import { updateProfile } from '../utils/authService';

const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');

  // Profile picture and Identity states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(user?.avatar || null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [displayName, setDisplayName] = useState(user?.fullName || 'User');
  const [bio, setBio] = useState(user?.bio || '');
  const [displayNameError, setDisplayNameError] = useState('');

  // UI / Logic states
  const [notifications, setNotifications] = useState({ 
    email: true, 
    push: false, 
    reminders: true, 
    marketing: false, 
    securityAlerts: true,
    soundEnabled: true,
    desktopNotifications: false,
    notificationFrequency: 'realtime' as 'realtime' | 'daily' | 'weekly'
  });

  // Keyboard Shortcuts state
  const [keyboardShortcuts, setKeyboardShortcuts] = useState({
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

  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [password, setPassword] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<any>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const [theme, setTheme] = useState<'light' | 'dark' | 'system' | 'high-contrast'>(
    (user?.theme as any) || 'system'
  );

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  useEffect(() => {
    if (hasPendingDeletion()) setPendingDeletion(getPendingDeletion());
  }, []);

  /**
   * Handles theme change
   */
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system' | 'high-contrast') => {
    setTheme(newTheme);
  
    // Update user context
    if (updateUser) {
      updateUser({ theme: newTheme });
    }
  
    // Save to localStorage
    localStorage.setItem('userTheme', newTheme);
  
    // Apply theme to document
    const html = document.documentElement;
    html.classList.remove('light', 'dark', 'high-contrast');
  
    if (newTheme === 'system') {
      // Follow system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
      } else {
        html.classList.add('light');
      }
    } else if (newTheme === 'high-contrast') {
      html.classList.add('high-contrast', 'dark');
    } else {
      html.classList.add(newTheme);
    }
  };

  /**
   * Requirement 2.1.6 & 2.2.1: Save Profile Changes
   */
  const handleSaveChanges = async () => {
    if (!validateDisplayName(displayName)) return;

    try {
      const profileData = {
        displayName,
        bio,
        avatar: croppedImage as string | undefined,
        theme,
        notificationSettings: notifications,
        keyboardShortcuts
      };

      const result = await updateProfile(profileData);

      if (result.success) {
        updateUser(result.user); // Synchronize Global Auth State
        alert('Profile changes saved successfully!');
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('An error occurred while saving.');
    }
  };

  /**
   * Requirement 2.2.2: Display Name Validation
   */
  const validateDisplayName = (name: string): boolean => {
    if (name.length < 3 || name.length > 50) {
      setDisplayNameError('Display name must be between 3 and 50 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9\s\-_.]+$/.test(name)) {
      setDisplayNameError('Invalid characters used');
      return false;
    }
    setDisplayNameError('');
    return true;
  };

  const handleProfilePictureSelect = (file: File | null) => {
    setSelectedImage(file);
    if (file) setShowImageCropper(true);
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setCroppedImage(croppedImageUrl);
    setShowImageCropper(false);
  };

  const handleRemoveProfilePicture = () => {
    setCroppedImage(null);
    setSelectedImage(null);
    setShowRemoveConfirm(false);
    updateUser({ avatar: null });
    alert('Profile picture removed!');
  };

  /**
   * Requirement 2.5: Notification Settings
   */
  const toggleNotification = (key: keyof typeof notifications) => {
    if (key === 'notificationFrequency') return; // Handle frequency separately
    
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleAllNotifications = (enable: boolean) => {
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

  const handleFrequencyChange = (freq: 'realtime' | 'daily' | 'weekly') => {
    setNotifications(prev => ({
      ...prev,
      notificationFrequency: freq
    }));
  };

  /**
   * Requirement 2.6: Keyboard Shortcuts Customization
   */
  const handleShortcutChange = (action: string, shortcut: string) => {
    // Check for conflicts
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

  const resetShortcutsToDefault = () => {
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

  /**
   * Requirement 1.5: Secure Account Deletion with Forced Redirect
   */
  const handleDeleteAccount = async () => {
    if (!password) { alert('Please enter your password'); return; }
    if (deleteConfirmationText !== 'DELETE') { alert('Please type "DELETE"'); return; }

    setIsDeleting(true);
    try {
      const result = await requestAccountDeletion({ email: user?.email, password });
      if (result.success) {
        alert('Account deleted.');
        window.location.href = '/login'; // Hard redirect to wipe state
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Deletion failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteAccount = () => {
    setShowPasswordConfirm(false);
    setPassword('');
    setDeleteConfirmationText('');
    setDeletionReason('');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Epic 2: Profile Management and Customization</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigation */}
          <div className="w-full lg:w-64 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <tab.icon size={20} />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Settings Panel */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
            
            {/* ========== PERSONAL INFO TAB ========== */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-600 border-4 border-white dark:border-slate-800 shadow-md overflow-hidden">
                      <img 
                        src={croppedImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"} 
                        alt="Avatar" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="absolute bottom-0 right-0 flex gap-1">
                      <button 
                        onClick={() => document.getElementById('pic-upload')?.click()} 
                        className="bg-blue-600 text-white p-2 rounded-full border-2 border-white dark:border-slate-800 shadow-md hover:bg-blue-700 transition-colors"
                        title="Upload new picture"
                      >
                        <Camera size={16} />
                      </button>
                      {croppedImage && (
                        <button 
                          onClick={() => setShowRemoveConfirm(true)} 
                          className="bg-red-600 text-white p-2 rounded-full border-2 border-white dark:border-slate-800 shadow-md hover:bg-red-700 transition-colors"
                          title="Remove picture"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
                      {displayName || 'User'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                      Upload a new profile picture. Supported formats: JPG, PNG, WebP (Max 5MB)
                    </p>
                    <FileUpload 
                      onFileSelect={handleProfilePictureSelect} 
                      acceptedFormats={['.jpg', '.png', '.webp']} 
                      maxSizeMB={5} 
                    />
                  </div>
                </div>

                <input 
                  type="file" 
                  id="pic-upload" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleProfilePictureSelect(e.target.files?.[0] || null)} 
                />

                {/* Personal Info Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Display Name 
                    </label>
                    <input 
                      type="text" 
                      value={displayName} 
                      onChange={(e) => { 
                        setDisplayName(e.target.value); 
                        validateDisplayName(e.target.value); 
                      }} 
                      className={`w-full px-4 py-2 border rounded-lg outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                        displayNameError ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
                      }`}
                      placeholder="Enter your display name"
                    />
                    {displayNameError && (
                      <p className="text-red-600 dark:text-red-400 text-xs">{displayNameError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Email 
                    </label>
                    <input 
                      type="email" 
                      value={user?.email || ''} 
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400" 
                      disabled 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Bio 
                    </label>
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      rows={3} 
                      maxLength={500} 
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder="Share your creative journey..." 
                    />
                    <CharacterCounter currentLength={bio.length} maxLength={500} />
                  </div>
                </div>
              </div>
            )}

            {/* ========== APPEARANCE TAB ========== */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">
                    Theme & Display
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Customize how the application looks. Changes apply immediately.
                  </p>
                </div>

                {/* Theme Selector Component */}
                <ThemeSelector
                  currentTheme={theme}
                  onThemeChange={handleThemeChange}
                />

                {/* Quick Theme Toggle */}
                <div className="mt-8 p-6 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <h4 className="font-semibold text-slate-800 dark:text-white mb-4">
                    Quick Theme Toggle
                  </h4>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        theme === 'light'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Sun className="w-6 h-6 text-yellow-600" />
                        <span className="font-medium text-slate-800 dark:text-white">Light</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        theme === 'dark'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Moon className="w-6 h-6 text-indigo-400" />
                        <span className="font-medium text-slate-800 dark:text-white">Dark</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleThemeChange('system')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        theme === 'system'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Monitor className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        <span className="font-medium text-slate-800 dark:text-white">System</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========== NOTIFICATIONS TAB ========== */}
            {activeTab === 'notifications' && (
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
                      <p className="font-semibold text-slate-800 dark:text-white">In-App Notifications</p>
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
                        className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          notifications.push ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${
                          notifications.push ? 'transform translate-x-6' : ''
                        }`}></span>
                      </label>
                    </div>
                  </div>

                  {/* Email Notifications */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">Email Notifications</p>
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
                        className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          notifications.email ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${
                          notifications.email ? 'transform translate-x-6' : ''
                        }`}></span>
                      </label>
                    </div>
                  </div>

                  {/* Desktop Notifications */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">Desktop Notifications</p>
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
                        className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          notifications.desktopNotifications ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${
                          notifications.desktopNotifications ? 'transform translate-x-6' : ''
                        }`}></span>
                      </label>
                    </div>
                  </div>

                  {/* Sound Settings */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">Notification Sounds</p>
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
                          className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${
                            notifications.soundEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${
                            notifications.soundEnabled ? 'transform translate-x-6' : ''
                          }`}></span>
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
                        className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                          notifications.notificationFrequency === 'realtime'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Zap size={16} />
                        Real-time
                      </button>
                      <button
                        onClick={() => handleFrequencyChange('daily')}
                        className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                          notifications.notificationFrequency === 'daily'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Clock size={16} />
                        Daily Digest
                      </button>
                      <button
                        onClick={() => handleFrequencyChange('weekly')}
                        className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                          notifications.notificationFrequency === 'weekly'
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
            )}

            {/* ========== KEYBOARD SHORTCUTS TAB ========== */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">
                    Keyboard Shortcuts Customization
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Customize keyboard shortcuts for faster drawing workflow
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
            )}

            {/* ========== SECURITY TAB ========== */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Password Change Section */}
                <div className="p-6 border border-slate-100 dark:border-slate-700 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Lock className="text-slate-600 dark:text-slate-400" size={20} />
                    <h4 className="font-semibold text-slate-800 dark:text-white">Password</h4>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Change your password to keep your account secure.
                  </p>
                  <Button className="gap-2">
                    <Key size={16} /> Change Password
                  </Button>
                </div>

                {/* Two-Factor Authentication */}
                <div className="p-6 border border-slate-100 dark:border-slate-700 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Shield className="text-slate-600 dark:text-slate-400" size={20} />
                      <h4 className="font-semibold text-slate-800 dark:text-white">Two-Factor Authentication</h4>
                    </div>
                    <span className="px-3 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full">
                      Not Enabled
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Add an extra layer of security to your account.
                  </p>
                  <Button variant="outline" className="gap-2">
                    <Shield size={16} /> Enable 2FA
                  </Button>
                </div>

                {/* Active Sessions */}
                <div className="p-6 border border-slate-100 dark:border-slate-700 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="text-slate-600 dark:text-slate-400" size={20} />
                    <h4 className="font-semibold text-slate-800 dark:text-white">Active Sessions</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">Chrome on Windows</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Current session • Just now</p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">Safari on iPhone</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">2 days ago</p>
                      </div>
                      <Button variant="outline" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="mt-8 p-6 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
                    <h3 className="text-red-800 dark:text-red-300 font-bold">Danger Zone</h3>
                  </div>
                  
                  {showPasswordConfirm ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg">
                        <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">⚠️ Confirm Account Deletion</h4>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                          This action cannot be undone. All your data will be permanently deleted.
                        </p>
                        
                        <div className="space-y-3 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                              Enter your password to confirm
                            </label>
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Current password"
                              className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-700 text-red-800 dark:text-red-300"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                              Reason for leaving (optional)
                            </label>
                            <select
                              value={deletionReason}
                              onChange={(e) => setDeletionReason(e.target.value)}
                              className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-700 text-red-800 dark:text-red-300"
                            >
                              <option value="">Select a reason...</option>
                              <option value="not-useful">Didn't find it useful</option>
                              <option value="too-complex">Too complicated to use</option>
                              <option value="privacy-concerns">Privacy concerns</option>
                              <option value="found-alternative">Found a better alternative</option>
                              <option value="other">Other reason</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                              Type "DELETE" to confirm
                            </label>
                            <input
                              type="text"
                              value={deleteConfirmationText}
                              onChange={(e) => setDeleteConfirmationText(e.target.value)}
                              placeholder="Type DELETE here"
                              className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-700 text-red-800 dark:text-red-300 uppercase"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={handleDeleteAccount}
                          isLoading={isDeleting}
                          className="bg-red-600 hover:bg-red-700 border-none gap-2"
                        >
                          <Trash2 size={16} /> Yes, Delete My Account
                        </Button>
                        <Button
                          onClick={cancelDeleteAccount}
                          variant="outline"
                          className="border-slate-300 dark:border-slate-600"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-red-600 dark:text-red-400 text-sm mb-4">
                        Once you delete your account, there is no going back. All your data will be permanently removed.
                      </p>
                      <Button
                        onClick={() => setShowPasswordConfirm(true)}
                        className="bg-red-600 hover:bg-red-700 border-none gap-2"
                      >
                        <Trash2 size={16} /> Delete Account Permanently
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Save Changes Button */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <Button onClick={handleSaveChanges} className="gap-2">
                <Save size={18} /> Save Changes 
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <DeletionSurveyModal 
        isOpen={showSurveyModal} 
        onClose={() => setShowSurveyModal(false)} 
        onComplete={() => window.location.href = '/'} 
        userEmail={user?.email || ''} 
      />

      {showImageCropper && selectedImage && (
        <ImageCropper 
          imageSrc={URL.createObjectURL(selectedImage)} 
          onCropComplete={handleCropComplete} 
          onCancel={() => setShowImageCropper(false)} 
          circularCrop={true} 
        />
      )}

      {/* Remove Profile Picture Confirmation Modal */}
      <Modal
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        title="Remove Profile Picture"
      >
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-600 border-4 border-white dark:border-slate-800 overflow-hidden">
              <img 
                src={croppedImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"} 
                alt="Current profile" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          <p className="text-slate-600 dark:text-slate-300 text-center">
            Are you sure you want to remove your profile picture? This will revert to the default avatar.
          </p>
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => setShowRemoveConfirm(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveProfilePicture}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Remove Picture
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Helper function for shortcut descriptions
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

// Add Calendar icon import helper
const Calendar = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

export default ProfilePage;