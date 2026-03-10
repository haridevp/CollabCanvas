import React, { useState, useEffect } from 'react';
import { X, Lock, Hash, AlertCircle, Check, Globe } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import roomService from '../../services/roomService';
import { useNavigate } from 'react-router-dom';

/**
 * Props interface for the RoomJoinModal component
 * @interface RoomJoinModalProps
 */
interface RoomJoinModalProps {
  /** Controls the visibility of the join modal */
  isOpen: boolean;
  /** Callback function invoked when the modal is closed */
  onClose: () => void;
}

/**
 * Modal component for joining existing rooms using room codes
 * 
 * This component provides a two-step process for joining rooms:
 * 1. Enter and validate room code
 * 2. Enter password (if required)
 * 
 * @component
 * @example
 * ```tsx
 * <RoomJoinModal
 *   isOpen={isJoinModalOpen}
 *   onClose={() => setJoinModalOpen(false)}
 * />
 * ```
 */
const RoomJoinModal: React.FC<RoomJoinModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  
  // Form state management
  const [roomCode, setRoomCode] = useState('');
  const [password, setPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string>('');
  const [requiresPassword, setRequiresPassword] = useState<boolean>(false);
  const [validationChecked, setValidationChecked] = useState(false);

  /**
   * Effect to reset form when modal opens/closes
   * 
   * Ensures a clean state each time the modal is opened
   */
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  /**
   * Validates the room code with the server
   * 
   * @async
   * @returns {Promise<void>}
   * 
   * This function:
   * 1. Checks if room code is provided
   * 2. Calls the validation API
   * 3. Updates state based on validation result
   * 4. Handles errors gracefully
   */
  const validateRoom = async (): Promise<void> => {
    // Validate input
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    // Set loading state
    setIsValidating(true);
    setError('');

    try {
      // Call validation API
      const result = await roomService.validateRoom(roomCode);
      
      if (result.success) {
        // Update state with validation results
        setRequiresPassword(result.requiresPassword || false);
        setValidationChecked(true);
        
        // If no password required, join directly
        if (!result.requiresPassword) {
          handleJoin();
        }
      } else {
        // Handle validation failure
        setError(result.message || 'Room not found');
        setValidationChecked(false);
      }
    } catch (err) {
      // Handle network or unexpected errors
      setError('Failed to validate room. Please try again.');
      setValidationChecked(false);
    } finally {
      // Reset loading state
      setIsValidating(false);
    }
  };

  /**
   * Joins the room after validation
   * 
   * @async
   * @returns {Promise<void>}
   * 
   * This function:
   * 1. Validates inputs
   * 2. Calls join room API
   * 3. Navigates to room on success
   * 4. Handles errors appropriately
   */
  const handleJoin = async (): Promise<void> => {
    // Validate room code
    if (!roomCode.trim()) {
      setError('Room code is required');
      return;
    }

    // Validate password for protected rooms
    if (requiresPassword && !password.trim()) {
      setError('Password is required for this room');
      return;
    }

    // Set loading state
    setIsJoining(true);
    setError('');

    try {
      // Prepare join data
      const joinData = {
        roomId: roomCode,
        password: requiresPassword ? password : undefined
      };

      // Call join API
      const result = await roomService.joinRoom(joinData);

      if (result.success) {
        // Navigate to room on success
        navigate(`/room/${roomCode}`);
        resetForm();
        onClose();
      } else {
        // Handle join failure
        setError(result.message || 'Failed to join room');
      }
    } catch (err) {
      // Handle network or unexpected errors
      setError('Failed to join room. Please try again.');
    } finally {
      // Reset loading state
      setIsJoining(false);
    }
  };

  /**
   * Resets the form to its initial state
   * 
   * Clears all form fields and state variables
   */
  const resetForm = (): void => {
    setRoomCode('');
    setPassword('');
    setError('');
    setRequiresPassword(false);
    setValidationChecked(false);
  };

  /**
   * Handles modal close with form reset
   */
  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  /**
   * Returns to the room code input step
   * 
   * Used when user wants to change the room code after validation
   */
  const handleBack = (): void => {
    setValidationChecked(false);
    setRequiresPassword(false);
    setPassword('');
    setError('');
  };

  /**
   * Formats room code for display
   * 
   * @param {string} code - The raw room code
   * @returns {string} Formatted room code
   */
  const formatRoomCode = (code: string): string => {
    // Convert to uppercase and remove any non-alphanumeric characters
    return code.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  };

  /**
   * Navigates to public rooms gallery
   * 
   * This function would typically be implemented to redirect
   * users to a public rooms browsing interface
   */
  const navigateToPublicRooms = (): void => {
    handleClose();
    // TODO: Implement navigation to public rooms gallery
    // navigate('/public-rooms');
    console.log('Navigate to public rooms gallery');
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 dark:bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {validationChecked ? 'Join Room' : 'Enter Room Code'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Close modal"
            disabled={isJoining || isValidating}
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {!validationChecked ? (
            // Step 1: Room Code Input
            <div className="space-y-4">
              {/* Header Section */}
              <div className="text-center mb-4">
                <div 
                  className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3"
                  aria-hidden="true"
                >
                  <Hash className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Enter the room code provided by the room owner
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div 
                  className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle 
                      className="w-5 h-5 text-red-600 dark:text-red-400" 
                      aria-hidden="true" 
                    />
                    <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Room Code Input */}
              <div className="space-y-2">
                <label 
                  htmlFor="room-code" 
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Room Code
                </label>
                <input
                  id="room-code"
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(formatRoomCode(e.target.value))}
                 
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-mono text-lg tracking-wider uppercase"
                  maxLength={20}
                  disabled={isValidating}
                  aria-required="true"
                  aria-describedby="room-code-help"
                  autoFocus
                />
                <p 
                  id="room-code-help"
                  className="text-xs text-slate-500 dark:text-slate-400 text-center"
                >
                  Enter the code exactly as provided
                </p>
              </div>

              {/* Continue Button */}
              <Button
                onClick={validateRoom}
                isLoading={isValidating}
                disabled={isValidating || !roomCode.trim()}
                className="w-full"
                aria-label="Validate room code"
              >
                Continue
              </Button>

              {/* Footer Links */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                  Don't have a room code?{' '}
                  <button
                    onClick={navigateToPublicRooms}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    aria-label="Browse public rooms"
                    disabled={isValidating}
                  >
                    Browse public rooms
                  </button>
                </p>
              </div>
            </div>
          ) : (
            // Step 2: Password Input (if required)
            <div className="space-y-4">
              {/* Header Section */}
              <div className="text-center mb-4">
                <div 
                  className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3"
                  aria-hidden="true"
                >
                  {requiresPassword ? (
                    <Lock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <Globe className="w-8 h-8 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  {requiresPassword ? 'This room is password protected' : 'Ready to join!'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {requiresPassword 
                    ? 'Please enter the password to join'
                    : 'Click join to enter the room'
                  }
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div 
                  className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle 
                      className="w-5 h-5 text-red-600 dark:text-red-400" 
                      aria-hidden="true" 
                    />
                    <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Password Input (Conditional) */}
              {requiresPassword && (
                <div className="space-y-2">
                  <label 
                    htmlFor="room-password" 
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Room Password
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
                      disabled={isJoining}
                      aria-required="true"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleJoin}
                  isLoading={isJoining}
                  disabled={isJoining || (requiresPassword && !password.trim())}
                  className="flex-1"
                  aria-label="Join room"
                >
                  Join Room
                </Button>
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1"
                  disabled={isJoining}
                  aria-label="Go back to room code entry"
                >
                  Back
                </Button>
              </div>

              {/* Verification Status */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <p 
                  className="text-sm text-slate-500 dark:text-slate-400"
                  aria-live="polite"
                >
                  <span className="flex items-center gap-2 justify-center">
                    <Check size={14} className="text-green-500" aria-hidden="true" />
                    Room code verified: <span className="font-mono font-bold">{roomCode}</span>
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomJoinModal;