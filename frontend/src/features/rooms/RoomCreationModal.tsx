import React, { useState } from 'react';
import { X, Lock, Globe, Users, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import roomService from '../../services/roomService';

/**
 * Props interface for the RoomCreationModal component
 * @interface RoomCreationModalProps
 */
interface RoomCreationModalProps {
  /** Controls the visibility of the creation modal */
  isOpen: boolean;
  /** Callback function invoked when the modal is closed */
  onClose: () => void;
  /** Callback function invoked when a room is successfully created */
  onRoomCreated: (roomId: string) => void;
}

/**
 * Modal component for creating new collaborative rooms
 * 
 * This component provides a form interface for users to create new rooms
 * with configurable settings such as visibility, password protection,
 * and participant limits.
 * 
 * @component
 * @example
 * ```tsx
 * <RoomCreationModal
 *   isOpen={isCreateModalOpen}
 *   onClose={() => setCreateModalOpen(false)}
 *   onRoomCreated={(roomId) => handleNewRoomCreated(roomId)}
 * />
 * ```
 */
const RoomCreationModal: React.FC<RoomCreationModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated
}) => {
  // Form state management
  const [isCreating, setIsCreating] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [error, setError] = useState<string>('');

  /**
   * Handles form submission for room creation
   * 
   * @async
   * @param {React.FormEvent} e - The form submission event
   * @returns {Promise<void>}
   * 
   * This function:
   * 1. Validates form inputs
   * 2. Shows appropriate error messages
   * 3. Submits data to the room service API
   * 4. Handles success and error responses
   * 5. Resets form on success
   */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(''); // Clear previous errors

    // Validate room name presence
    if (!roomName.trim()) {
      setError('Room name is required');
      return;
    }

    // Validate room name length
    if (roomName.length < 3 || roomName.length > 50) {
      setError('Room name must be between 3 and 50 characters');
      return;
    }

    // Validate password for private rooms
    if (!isPublic && !password.trim()) {
      setError('Password is required for private rooms');
      return;
    }

    // Set loading state
    setIsCreating(true);

    try {
      // Prepare room data for API call
      const roomData = {
        name: roomName,
        description: description.trim() || undefined, // Send undefined if empty
        isPublic,
        password: !isPublic && password ? password : undefined, // Only include password for private rooms
        maxParticipants
      };

      // Call room creation API
      const result = await roomService.createRoom(roomData);

      if (result.success && result.room) {
        // Room created successfully
        onRoomCreated(result.room.id);
        resetForm(); // Clear form fields
      } else {
        // Handle API error response
        setError(result.message || 'Failed to create room');
      }
    } catch (err) {
      // Handle network or unexpected errors
      setError('Failed to create room. Please try again.');
    } finally {
      // Reset loading state regardless of outcome
      setIsCreating(false);
    }
  };

  /**
   * Resets the form to its initial state
   * 
   * This function clears all form fields and error messages,
   * returning the form to a clean state.
   */
  const resetForm = (): void => {
    setRoomName('');
    setDescription('');
    setIsPublic(true);
    setPassword('');
    setMaxParticipants(10);
    setError('');
  };

  /**
   * Handles modal close with form reset
   * 
   * This function ensures the form is cleared when the modal is closed,
   * preventing stale data from persisting between openings.
   */
  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 dark:bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Create New Room
          </h2>
          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Close modal"
            disabled={isCreating}
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Display */}
            {error && (
              <div
                className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                role="alert"
                aria-live="polite"
              >
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Room Name Input */}
            <div className="space-y-2">
              <label
                htmlFor="room-name"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Room Name *
              </label>
              <input
                id="room-name"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
               
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                maxLength={50}
                required
                disabled={isCreating}
                aria-required="true"
                aria-describedby="room-name-help"
              />
              <div className="flex justify-between">
                <span
                  id="room-name-help"
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  {roomName.length}/50 characters
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Required
                </span>
              </div>
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <label
                htmlFor="room-description"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Description (Optional)
              </label>
              <textarea
                id="room-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
               
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                rows={3}
                maxLength={200}
                disabled={isCreating}
                aria-describedby="description-help"
              />
              <div className="flex justify-between">
                <span
                  id="description-help"
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  {description.length}/200 characters
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Optional
                </span>
              </div>
            </div>

            {/* Room Visibility Selection */}
            <div className="space-y-3">
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Room Visibility
              </span>
              <div className="grid grid-cols-2 gap-3">
                {/* Public Room Option */}
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${isPublic
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  disabled={isCreating}
                  aria-pressed={isPublic}
                  aria-label="Public room - Anyone can find and join"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-white">Public</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Anyone can find and join
                  </p>
                </button>

                {/* Private Room Option */}
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${!isPublic
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  disabled={isCreating}
                  aria-pressed={!isPublic}
                  aria-label="Private room - Password required to join"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-white">Private</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Password required to join
                  </p>
                </button>
              </div>
            </div>

            {/* Password Input (Conditional - only for private rooms) */}
            {!isPublic && (
              <div className="space-y-2">
                <label
                  htmlFor="room-password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Room Password *
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-3 text-slate-400"
                    size={20}
                    aria-hidden="true"
                  />
                  <input
                    id="room-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                   
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    minLength={4}
                    required={!isPublic}
                    disabled={isCreating}
                    aria-required="true"
                    aria-describedby="password-help"
                  />
                </div>
                <p
                  id="password-help"
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  Minimum 4 characters. Share this with invited users.
                </p>
              </div>
            )}

            {/* Maximum Participants Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Maximum Participants
                </span>
                <span
                  className="text-sm font-medium text-blue-600 dark:text-blue-400"
                  aria-live="polite"
                >
                  {maxParticipants} users
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Users className="text-slate-400" size={20} aria-hidden="true" />
                <input
                  type="range"
                  min="2"
                  max="100"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  disabled={isCreating}
                  aria-label="Maximum participants slider"
                  aria-valuemin={2}
                  aria-valuemax={100}
                  aria-valuenow={maxParticipants}
                />
              </div>
              <div
                className="flex justify-between text-xs text-slate-500 dark:text-slate-400"
                role="presentation"
              >
                <span>Small (2-10)</span>
                <span>Medium (11-50)</span>
                <span>Large (51-100)</span>
              </div>
            </div>

            {/* Information Note */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Info
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You will be the room owner and have full control over settings, participants, and permissions.
                </p>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex gap-3 pt-4">
              {/* Create Room Button */}
              <Button
                type="submit"
                isLoading={isCreating}
                disabled={isCreating}
                className="flex-1"
                aria-label={isCreating ? "Creating room..." : "Create room"}
              >
                Create Room
              </Button>

              {/* Cancel Button */}
              <Button
                type="button"
                onClick={handleClose}
                variant="outline"
                className="flex-1"
                disabled={isCreating}
                aria-label="Cancel room creation"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomCreationModal;