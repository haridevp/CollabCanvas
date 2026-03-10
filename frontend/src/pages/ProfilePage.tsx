import { useState } from 'react';
import CharacterCounter from '../components/ui/CharacterCounter';
import FileUpload from '../components/ui/FileUpload';
import ImageCropper from '../components/ui/ImageCropper';
import { useAuth } from '../services/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { Camera, Save, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { updateProfile } from '../utils/authService';

/**
 * ProfilePage component - Personal Info management
 * 
 * This component provides a profile management interface for personal information:
 * profile picture, display name, email, and bio.
 * 
 * Other settings (Appearance, Notification Settings, Keyboard Shortcuts, Security)
 * are now accessible as separate pages from the sidebar.
 */
const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile picture and Identity states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showImageCropper, setShowImageCropper] = useState<boolean>(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(user?.avatar || null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>(user?.fullName || 'User');
  const [bio, setBio] = useState<string>(user?.bio || '');
  const [displayNameError, setDisplayNameError] = useState<string>('');

  /**
   * Saves profile changes to the backend
   */
  const handleSaveChanges = async (): Promise<void> => {
    if (!validateDisplayName(displayName)) return;

    try {
      const profileData = {
        displayName,
        bio,
        avatar: croppedImage as string | undefined,
      };

      const result = await updateProfile(profileData) as any;

      if (result.success) {
        updateUser(result.user);
        alert('Profile changes saved successfully!');
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('An error occurred while saving.');
    }
  };

  /**
   * Validates display name according to platform requirements
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

  const handleProfilePictureSelect = (file: File | null): void => {
    setSelectedImage(file);
    if (file) setShowImageCropper(true);
  };

  const handleCropComplete = (croppedImageUrl: string): void => {
    setCroppedImage(croppedImageUrl);
    setShowImageCropper(false);
  };

  const handleRemoveProfilePicture = (): void => {
    setCroppedImage(null);
    setSelectedImage(null);
    setShowRemoveConfirm(false);
    updateUser({ avatar: null });
    alert('Profile picture removed!');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal information and profile picture.
          </p>
        </header>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
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
                <label htmlFor="displayName" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    validateDisplayName(e.target.value);
                  }}
                  className={`w-full px-4 py-2 border rounded-lg outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${displayNameError ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
                    }`}
                 
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
                <label htmlFor="bio" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                 
                />
                <CharacterCounter currentLength={bio.length} maxLength={500} />
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

export default ProfilePage;