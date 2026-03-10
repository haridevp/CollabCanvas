// src/features/rooms/RoomSettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  Settings, Lock, Globe, Users, Trash2, Save, X, AlertTriangle,
  Eye, EyeOff, Copy, Check, Link, Download, Upload, RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { Room, CreateRoomData } from '../../services/roomService';
import roomService from '../../services/roomService';

/**
 * Props interface for the RoomSettingsPanel component
 * @interface RoomSettingsPanelProps
 */
interface RoomSettingsPanelProps {
  /** The room object containing current settings */
  room: Room;
  /** Current user's role in the room */
  currentUserRole: 'owner' | 'moderator' | 'participant';
  /** Controls whether the settings panel is visible */
  isOpen: boolean;
  /** Callback function invoked when the panel is closed */
  onClose: () => void;
  /** Optional callback invoked when room settings are successfully updated */
  onSettingsUpdated?: (updatedRoom: Room) => void;
  /** Optional callback invoked when a room is deleted */
  onRoomDeleted?: (roomId: string) => void;
}

/**
 * Settings panel component for configuring room properties and permissions
 * 
 * This component provides a sidebar interface for room owners and moderators
 * to manage room settings, including name, description, visibility, and
 * participant limits. It also includes dangerous actions like room deletion.
 * 
 * @component
 * @example
 * ```tsx
 * <RoomSettingsPanel
 *   room={currentRoom}
 *   currentUserRole="owner"
 *   isOpen={isSettingsOpen}
 *   onClose={() => setSettingsOpen(false)}
 *   onSettingsUpdated={(updatedRoom) => updateRoom(updatedRoom)}
 *   onRoomDeleted={(roomId) => handleRoomDeleted(roomId)}
 * />
 * ```
 */
const RoomSettingsPanel: React.FC<RoomSettingsPanelProps> = ({
  room,
  currentUserRole,
  isOpen,
  onClose,
  onSettingsUpdated,
  onRoomDeleted
}) => {
  // State for loading and saving operations
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for UI interactions
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Form state for editing room settings
  const [formData, setFormData] = useState<CreateRoomData>({
    name: room.name,
    description: room.description || '',
    isPublic: room.isPublic,
    password: '',
    maxParticipants: room.maxParticipants || 10
  });

  // Toggle for showing/hiding password
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Effect to initialize form data when panel opens or room changes
   * 
   * Resets the form to current room settings and clears any messages
   */
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: room.name,
        description: room.description || '',
        isPublic: room.isPublic,
        password: '',
        maxParticipants: room.maxParticipants || 10
      });
      setError('');
      setSuccess('');
    }
  }, [isOpen, room]);

  /**
   * Generic handler for form input changes
   * 
   * @param field - The field name to update
   * @param value - The new value for the field
   */
  const handleInputChange = (field: keyof CreateRoomData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Saves the updated room settings to the server
   * 
   * @async
   * @returns {Promise<void>}
   * 
   * This function:
   * 1. Validates required fields
   * 2. Prepares update data (only changed fields)
   * 3. Calls the update API
   * 4. Handles success and error responses
   */
  const handleSaveSettings = async () => {
    // Validate room name
    if (!formData.name.trim()) {
      setError('Room name is required');
      return;
    }

    // Set loading state
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // Prepare update payload with only changed fields
      const updates: Partial<CreateRoomData> = {
        name: formData.name,
        description: formData.description,
        maxParticipants: formData.maxParticipants
      };

      // Only update visibility if it changed
      if (formData.isPublic !== room.isPublic) {
        updates.isPublic = formData.isPublic;
      }

      // Only include password if provided (for private rooms)
      if (!formData.isPublic && formData.password) {
        updates.password = formData.password;
      }

      // Call API to update room
      const result = await roomService.updateRoom(room.id, updates);

      if (result.success) {
        // Show success message and update parent
        setSuccess('Room settings updated successfully');
        if (onSettingsUpdated) {
          onSettingsUpdated({ ...room, ...updates });
        }
        // Close panel after delay
        setTimeout(() => {
          setSuccess('');
          onClose();
        }, 2000);
      } else {
        // Show API error
        setError(result.message || 'Failed to update room settings');
      }
    } catch (err) {
      // Show generic error
      setError('Failed to update room settings. Please try again.');
    } finally {
      // Reset loading state
      setIsSaving(false);
    }
  };

  /**
   * Deletes the room permanently
   * 
   * @async
   * @returns {Promise<void>}
   * 
   * This function:
   * 1. Confirms deletion via modal
   * 2. Calls delete API
   * 3. Notifies parent component
   * 4. Closes panel on success
   */
  const handleDeleteRoom = async () => {
    setIsLoading(true);
    try {
      const result = await roomService.deleteRoom(room.id);
      if (result.success) {
        // Notify parent and close
        if (onRoomDeleted) {
          onRoomDeleted(room.id);
        }
        onClose();
      } else {
        // Show API error
        setError(result.message || 'Failed to delete room');
      }
    } catch (err) {
      // Show generic error
      setError('Failed to delete room. Please try again.');
    } finally {
      // Reset states
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  /**
   * Copies the room link to clipboard
   */
  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/room/${room.id}`;
    navigator.clipboard.writeText(roomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Copies the room ID to clipboard
   */
  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Permission flags
  const isOwner = currentUserRole === 'owner';
  const isModerator = currentUserRole === 'moderator' || isOwner;

  // Don't render if panel is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl z-50 flex flex-col">
      {/* Header section */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Room Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Room status summary */}
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Room Status</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              room.isPublic
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
            }`}>
              {room.isPublic ? 'Public' : 'Private'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Participants</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {room.participantCount}/{room.maxParticipants}
            </span>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Error message display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Success message display */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-700 dark:text-green-300 text-sm">{success}</p>
          </div>
        )}

        {/* Room settings form */}
        <div className="space-y-6">
          {/* Room name input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Room Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              disabled={!isModerator}
              maxLength={50}
            />
            <div className="flex justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formData.name.length}/50 characters
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Required
              </span>
            </div>
          </div>

          {/* Description input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              rows={3}
              maxLength={200}
              disabled={!isModerator}
            />
            <div className="flex justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formData.description?.length || 0}/200 characters
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Optional
              </span>
            </div>
          </div>

          {/* Visibility settings (owner only) */}
          {isOwner && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Room Visibility
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('isPublic', true)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    formData.isPublic
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-slate-800 dark:text-white">Public</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Anyone can find and join
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange('isPublic', false)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    !formData.isPublic
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-purple-500" />
                    <span className="font-semibold text-slate-800 dark:text-white">Private</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Password required to join
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Password input (for private rooms, owner only) */}
          {!formData.isPublic && isOwner && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Room Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                 
                  className="w-full pl-4 pr-12 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Minimum 4 characters. Leave empty to keep current password.
              </p>
            </div>
          )}

          {/* Maximum participants slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Maximum Participants
              </label>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {formData.maxParticipants} users
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Users className="text-slate-400" size={20} />
              <input
                type="range"
                min="2"
                max="50"
                value={formData.maxParticipants}
                onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                disabled={!isModerator}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Small (2-10)</span>
              <span>Medium (11-30)</span>
              <span>Large (31-50)</span>
            </div>
          </div>

          {/* Room information display (read-only) */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Room Information</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Room ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {room.id}
                  </code>
                  <button
                    onClick={copyRoomCode}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    aria-label={copied ? "Copied!" : "Copy room ID"}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Room Link</span>
                <button
                  onClick={copyRoomLink}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  aria-label={copied ? "Link copied!" : "Copy room link"}
                >
                  <Link size={16} />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Created</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {new Date(room.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Last Updated</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {new Date(room.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with action buttons */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
        {/* Save button (moderators and owners) */}
        {isModerator && (
          <Button
            onClick={handleSaveSettings}
            isLoading={isSaving}
            disabled={isSaving}
            className="w-full gap-2"
          >
            <Save size={18} />
            Save Changes
          </Button>
        )}

        {/* Danger zone (owner only) */}
        {isOwner && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-red-700 dark:text-red-300">Danger Zone</h3>
            </div>
            
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              className="w-full gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 size={18} />
              Delete Room Permanently
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 dark:bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Delete Room</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-sm">
                  All room data, including drawings, chat history, and participant information will be permanently deleted. This action cannot be reversed.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleDeleteRoom}
                  isLoading={isLoading}
                  disabled={isLoading}
                  className="w-full gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Trash2 size={18} />
                  Yes, Delete Room
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomSettingsPanel;