import { useState, useEffect } from 'react';
import CharacterCounter from '../components/ui/CharacterCounter';
import FileUpload from '../components/ui/FileUpload';
import ImageCropper from '../components/ui/ImageCropper';
import { useAuth } from '../services/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { User, Shield, Bell, Palette, Camera, Save, Trash2, AlertTriangle, Lock, Key, LogOut, Mail, X, Check } from 'lucide-react';
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

/**
 * ProfilePage component - User profile settings page
 * Allows users to manage personal information, appearance, notifications, and security settings
 */
const ProfilePage = () => {
  // Get auth context including updateUser function
  const { user, updateUser, logout } = useAuth();
  
  // Active tab state for settings navigation
  const [activeTab, setActiveTab] = useState('personal');

  // Profile picture states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Personal info form state
  const [displayName, setDisplayName] = useState(user?.name || 'User');
  const [bio, setBio] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');

  // Notifications state
  const [notifications, setNotifications] = useState({ 
    email: true, 
    push: false,
    reminders: true,
    marketing: false,
    securityAlerts: true
  });

  // Account deletion states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [password, setPassword] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<any>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Tab configuration for settings navigation
  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  // Check for pending deletion on mount
  useEffect(() => {
    if (hasPendingDeletion()) {
      setPendingDeletion(getPendingDeletion());
    }
  }, []);

  /**
   * Handles saving profile changes
   * In production, this would update user data via API
   */
  const handleSaveChanges = () => {
    // Validate display name before saving
    const isNameValid = validateDisplayName(displayName);
    if (!isNameValid) {
      alert('Please fix the errors before saving.');
      return;
    } 
    console.log('Saving profile changes:', {
      displayName,
      bio,
      bioLength: bio.length,
      notificationPreferences: notifications
    }); 
    alert('Profile changes saved successfully!'); 
    // Update user context if needed
    if (updateUser) {
      updateUser({ name: displayName });
    }
  };

  /**
   * Handles profile picture upload
   * In production, this would upload to cloud storage
   */
  const handleProfilePictureUpload = () => {
    console.log('Uploading profile picture');
  };

  /**
   * Handles profile picture file selection
   */
  const handleProfilePictureSelect = (file: File | null) => {
    setSelectedImage(file);
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCroppedImage(imageUrl);
      setShowImageCropper(true);
    }
  };

  /**
  * Handles cropped image completion
  */
  const handleCropComplete = (croppedImageUrl: string) => {
    setCroppedImage(croppedImageUrl);
    setShowImageCropper(false);
    // In production, upload to server here
    console.log('Cropped image ready for upload:', croppedImageUrl);
  };

  /**
  * Removes profile picture
   */
  const handleRemoveProfilePicture = () => {
    setCroppedImage(null);
    setSelectedImage(null);
    setShowRemoveConfirm(false);
    // In production, send API request to remove profile picture
    console.log('Profile picture removed');
    // Update user context
    if (updateUser) {
      updateUser({ avatar: null });
    }
    alert('Profile picture removed successfully!');
  };

  /**
   * Saves profile picture
   */
  const handleSaveProfilePicture = () => {
    if (!croppedImage) {
      alert('Please select an image first');
      return;
    } 
    // In production, upload croppedImage to server
    // Example: await api.post('/profile/picture', { image: croppedImage });
    console.log('Saving profile picture:', croppedImage); 
    // Update user context
    if (updateUser) {
      updateUser({ avatar: croppedImage });
    }
    alert('Profile picture updated successfully!');
    setSelectedImage(null);
  };

  /**
  * Validates display name according to requirements (3-50 characters)
  */
  const validateDisplayName = (name: string): boolean => {
    if (name.length < 3) {
      setDisplayNameError('Display name must be at least 3 characters');
      return false;
    }
    if (name.length > 50) {
      setDisplayNameError('Display name cannot exceed 50 characters');
      return false;
    }
    // Allow letters, numbers, spaces, hyphens, underscores, periods
    if (!/^[a-zA-Z0-9\s\-_.]+$/.test(name)) {
      setDisplayNameError('Only letters, numbers, spaces, hyphens, underscores and periods allowed');
      return false;
    }
    setDisplayNameError('');
    return true;
  };

  /**
   * Toggle individual notification setting
   */
  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  /**
   * Toggle all notifications on/off
   */
  const toggleAllNotifications = (enable: boolean) => {
    setNotifications({
      email: enable,
      push: enable,
      reminders: enable,
      marketing: enable,
      securityAlerts: enable
    });
  };

  /**
   * Handles account deletion with password verification
   */
  const handleDeleteAccount = async () => {
    if (!showPasswordConfirm) {
      setShowPasswordConfirm(true);
      return;
    }

    if (!password) {
      alert('Please enter your password');
      return;
    }

    if (deleteConfirmationText !== 'DELETE') {
      alert('Please type "DELETE" to confirm');
      return;
    }

    setIsDeleting(true);

  try {
    const deletionRequest = {
      email: user?.email || '',
      password,
      reason: deletionReason
    };

    const result = await requestAccountDeletion(deletionRequest);

    if (result.success) {
      // 1. Logic is already handled in service to clearUserData(), 
      // but we force a redirect here.
      alert('Your account has been permanently deleted.');
      
      // 2. Force navigation to login
      // Using window.location.href ensures all remaining state is wiped
      window.location.href = '/login'; 
    } else {
      alert(result.message);
    }
  } catch (error: any) {
    console.error('Account deletion error:', error);
    alert('Failed to delete account. Please try again.');
  } finally {
    setIsDeleting(false);
  }
};

  /**
   * Cancels account deletion
   */
  const cancelDeleteAccount = () => {
    setShowDeleteConfirm(false);
    setShowPasswordConfirm(false);
    setPassword('');
    setDeleteConfirmationText('');
    setDeletionReason('');
  };

  /**
   * Cancels pending deletion
   */
  const handleCancelPendingDeletion = async () => {
    if (!pendingDeletion?.id) return;

    const result = await cancelAccountDeletion(pendingDeletion.id);
    
    if (result.success) {
      setPendingDeletion(null);
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  /**
   * Immediately deletes account (for demo/testing)
   */
  const handleImmediateDeletion = async () => {
    const confirmed = confirm('Are you absolutely sure? This will immediately delete all your data and cannot be undone.');
    
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      // In production, this would call: POST /api/user/delete-immediately
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear frontend data
      clearUserData();
      
      // Logout user
      logout();
      
      // Show survey modal
      setShowSurveyModal(true);
    } catch (error) {
      console.error('Immediate deletion error:', error);
      alert('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Completes the deletion survey flow
   */
  const handleSurveyComplete = () => {
    // Redirect to home page after survey
    window.location.href = '/';
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar navigation */}
      <Sidebar />
      
      {/* Main content area */}
      <main className="flex-1 p-8">
        {/* Page header */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Profile Settings
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Manage your account preferences and identity
              </p>
            </div>
          </div>
        </header>

        {/* Settings layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Settings navigation sidebar */}
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
                aria-label={`View ${tab.label} settings`}
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                <tab.icon size={20} aria-hidden="true" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Settings content panel */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-6" role="tabpanel" aria-label="Personal Information Settings">
                {/* Profile picture section */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-600 border-4 border-white dark:border-slate-800 shadow-md overflow-hidden">
                      <img 
                        src={croppedImage || user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"} 
                        alt="User avatar" 
                        className="w-full h-full object-cover"
                        aria-label="User profile picture"
                      />
                    </div>
                    <div className="absolute bottom-0 right-0 flex gap-1">
                      <button 
                        onClick={() => document.getElementById('profilePictureUpload')?.click()}
                        className="bg-blue-600 text-white p-2 rounded-full border-2 border-white dark:border-slate-800 hover:bg-blue-700 transition-colors shadow-md"
                        aria-label="Update profile picture"
                        title="Upload new picture"
                      >
                        <Camera size={16} aria-hidden="true" />
                      </button>
                      {croppedImage || user?.avatar ? (
                        <button 
                          onClick={() => setShowRemoveConfirm(true)}
                          className="bg-red-600 text-white p-2 rounded-full border-2 border-white dark:border-slate-800 hover:bg-red-700 transition-colors shadow-md"
                          aria-label="Remove profile picture"
                          title="Remove picture"
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </div>
  
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
                      {displayName || 'User'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                      Upload a new profile picture. Supported formats: JPG, PNG, WebP (Max 5MB)
                    </p>
    
                    {/* File Upload Component */}
                    <div className="max-w-md">
                      <FileUpload
                        onFileSelect={handleProfilePictureSelect}
                        acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
                        maxSizeMB={5}
                      />
                    </div>
    
                    {/* Save button for profile picture */}
                    {croppedImage && croppedImage !== user?.avatar && (
                      <div className="mt-4 flex gap-3">
                        <Button
                          onClick={handleSaveProfilePicture}
                          className="gap-2"
                        >
                        <Check size={16} />
                          Save Profile Picture
                        </Button>
                        <Button
                          onClick={() => {
                            setCroppedImage(user?.avatar || null);
                            setSelectedImage(null);
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hidden file input for direct click */}
                <input
                  type="file"
                  id="profilePictureUpload"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleProfilePictureSelect(file);
                    }
                  }}
                />

                {/* Personal information form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Display Name Field */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="displayName" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Display Name
                      </label>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {displayName.length}/50
                      </span>
                    </div>
                    <input 
                      id="displayName"
                      type="text" 
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        validateDisplayName(e.target.value);
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                        displayNameError 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-slate-200 dark:border-slate-600'
                      }`}
                      placeholder="Enter your display name"
                      aria-label="Enter display name"
                      aria-describedby={displayNameError ? "displayNameError" : undefined}
                    />
                    {displayNameError && (
                      <p id="displayNameError" className="text-red-600 dark:text-red-400 text-sm">
                        {displayNameError}
                      </p>
                    )}
                  </div>

                  {/* Email Field (Read-only) */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Email Address
                    </label>
                    <input 
                      id="email"
                      type="email" 
                      value={user?.email || "user@example.com"} 
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
                      disabled 
                      aria-label="Email address (read-only)"
                    />
                  </div>

                  {/* Bio Field */}
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="bio" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Bio
                      </label>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Optional, max 500 characters
                      </span>
                    </div>
                    <textarea 
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3} 
                      placeholder="Tell us about yourself, your interests, or your creative work..." 
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      aria-label="Enter your bio"
                      maxLength={500}
                    />
                    {/* Character Counter Component */}
                    <CharacterCounter
                      currentLength={bio.length}
                      maxLength={500}
                      warningThreshold={80}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6" role="tabpanel" aria-label="Appearance Settings">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                  Theme Preference
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => updateUser({ theme: 'light' })}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      user?.theme === 'light' 
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-transparent bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                    aria-label="Select light theme"
                    aria-pressed={user?.theme === 'light'}
                  >
                    <div className="w-full h-20 bg-slate-100 dark:bg-slate-600 rounded-md mb-3 border border-slate-200 dark:border-slate-500"></div>
                    <span className="font-bold text-slate-900 dark:text-white">Light Mode</span>
                  </button>
                  
                  <button 
                    onClick={() => updateUser({ theme: 'dark' })}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      user?.theme === 'dark' 
                        ? 'border-blue-600 dark:border-blue-500 bg-slate-800' 
                        : 'border-transparent bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600'
                    }`}
                    aria-label="Select dark theme"
                    aria-pressed={user?.theme === 'dark'}
                  >
                    <div className="w-full h-20 bg-slate-800 dark:bg-slate-600 rounded-md mb-3 border border-slate-700 dark:border-slate-500"></div>
                    <span className="font-bold text-white dark:text-slate-300">Dark Mode</span>
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6" role="tabpanel" aria-label="Notifications Settings">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                    Notification Preferences
                  </h3>
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
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">Email Notifications</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Receive updates about your rooms via email.
                      </p>
                    </div>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={notifications.email} 
                        onChange={() => toggleNotification('email')}
                        className="sr-only"
                        id="email-notifications"
                        aria-label="Toggle email notifications"
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

                  {/* Push Notifications */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">Push Notifications</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Receive real-time alerts on your device.
                      </p>
                    </div>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={notifications.push} 
                        onChange={() => toggleNotification('push')}
                        className="sr-only"
                        id="push-notifications"
                        aria-label="Toggle push notifications"
                      />
                      <label 
                        htmlFor="push-notifications"
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

                  {/* Meeting Reminders */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">Meeting Reminders</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Get reminders before scheduled meetings.
                      </p>
                    </div>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={notifications.reminders} 
                        onChange={() => toggleNotification('reminders')}
                        className="sr-only"
                        id="reminder-notifications"
                        aria-label="Toggle meeting reminders"
                      />
                      <label 
                        htmlFor="reminder-notifications"
                        className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          notifications.reminders ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${
                          notifications.reminders ? 'transform translate-x-6' : ''
                        }`}></span>
                      </label>
                    </div>
                  </div>

                  {/* Marketing Emails */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">Marketing Emails</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Receive updates about new features and promotions.
                      </p>
                    </div>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={notifications.marketing} 
                        onChange={() => toggleNotification('marketing')}
                        className="sr-only"
                        id="marketing-emails"
                        aria-label="Toggle marketing emails"
                      />
                      <label 
                        htmlFor="marketing-emails"
                        className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          notifications.marketing ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${
                          notifications.marketing ? 'transform translate-x-6' : ''
                        }`}></span>
                      </label>
                    </div>
                  </div>

                  {/* Security Alerts */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">Security Alerts</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Get notified about important security updates.
                      </p>
                    </div>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={notifications.securityAlerts} 
                        onChange={() => toggleNotification('securityAlerts')}
                        className="sr-only"
                        id="security-alerts"
                        aria-label="Toggle security alerts"
                      />
                      <label 
                        htmlFor="security-alerts"
                        className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          notifications.securityAlerts ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${
                          notifications.securityAlerts ? 'transform translate-x-6' : ''
                        }`}></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6" role="tabpanel" aria-label="Security Settings">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                  Security Settings
                </h3>

                {/* Password Change Section */}
                <div className="space-y-6">
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
                        <Button variant="outline" className="text-red-600 hover:bg-red-50">
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="mt-12 p-6 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
                      <h3 className="text-red-800 dark:text-red-300 font-bold">Danger Zone</h3>
                    </div>
                    
                    {/* Pending Deletion Warning */}
                    {pendingDeletion && (
                      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="text-yellow-600 dark:text-yellow-500 mt-0.5" size={18} />
                          <div className="flex-1">
                            <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                              ⚠️ Account Deletion Scheduled
                            </h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
                              Your account is scheduled for deletion on {new Date(pendingDeletion.scheduledFor).toLocaleDateString()} at {new Date(pendingDeletion.scheduledFor).toLocaleTimeString()}.
                            </p>
                            <div className="flex gap-2 mt-3">
                              <Button
                                onClick={handleCancelPendingDeletion}
                                variant="outline"
                                className="border-yellow-600 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                              >
                                Cancel Deletion
                              </Button>
                              <Button
                                onClick={handleImmediateDeletion}
                                className="bg-red-600 hover:bg-red-700 border-none"
                              >
                                Delete Immediately
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Account Deletion Flow */}
                    {showPasswordConfirm ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg">
                          <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">⚠️ Confirm Account Deletion</h4>
                          <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                            This action cannot be undone. All your data, including rooms, messages, and preferences will be permanently deleted.
                          </p>
                          
                          {/* Password Verification */}
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
                                className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-700 text-red-800 dark:text-red-300 placeholder-red-400"
                              />
                            </div>
                            
                            {/* Reason for deletion */}
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
                                <option value="temporary">Temporary account</option>
                                <option value="other">Other reason</option>
                              </select>
                            </div>
                            
                            {/* Confirmation text */}
                            <div>
                              <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                                Type "DELETE" to confirm
                              </label>
                              <input
                                type="text"
                                value={deleteConfirmationText}
                                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                placeholder="Type DELETE here"
                                className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-700 text-red-800 dark:text-red-300 placeholder-red-400 uppercase"
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
                        <div className="space-y-3">
                          <Button
                            onClick={() => setShowPasswordConfirm(true)}
                            className="bg-red-600 hover:bg-red-700 border-none gap-2"
                          >
                            <Trash2 size={16} /> Delete Account Permanently
                          </Button>
                          
                          {/* Immediate deletion option for testing */}
                          {import.meta.env.DEV && (
                            <Button
                              onClick={handleImmediateDeletion}
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
                            >
                              Delete Immediately (Dev Only)
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Save changes button (applies to all tabs) */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <Button 
                onClick={handleSaveChanges}
                className="gap-2"
                aria-label="Save all changes"
              >
                <Save size={18} aria-hidden="true" /> Save Changes
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Deletion Survey Modal */}
      <DeletionSurveyModal
        isOpen={showSurveyModal}
        onClose={() => setShowSurveyModal(false)}
        onComplete={handleSurveyComplete}
        userEmail={user?.email || ''}
      />

      {/* Image Cropper Modal */}
      {showImageCropper && selectedImage && (
        <ImageCropper
          imageSrc={URL.createObjectURL(selectedImage)}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowImageCropper(false);
            setSelectedImage(null);
            setCroppedImage(user?.avatar || null);
          }}
          circularCrop={true}
        />
      )}

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        title="Remove Profile Picture"
      >
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-600 border-4 border-white dark:border-slate-800 overflow-hidden">
              <img 
                src={croppedImage || user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"} 
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

export default ProfilePage;