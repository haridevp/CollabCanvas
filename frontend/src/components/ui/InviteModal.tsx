import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, Mail, Link, Users, Share2, MessageSquare,
  Facebook, Twitter, Linkedin, MessageCircle, Search, Loader2, Download,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from './Button';
import { searchUsers, inviteUsersToRoom } from '../../utils/authService';

/**
 * Interface defining the properties for the InviteModal component
 * 
 * @interface InviteModalProps
 * @property {boolean} isOpen - Controls whether the modal is visible
 * @property {() => void} onClose - Callback function to close the modal
 * @property {string} roomId - Unique identifier for the room
 * @property {string} roomName - Display name of the room
 * @property {boolean} isPublic - Whether the room is publicly accessible
 * @property {string} [roomPassword] - Optional password for private rooms
 */

/**
 * Interface defining the structure of a user object for invitations
 * 
 * @interface User
 * @property {string} id - Unique user identifier
 * @property {string} username - User's username/handle
 * @property {string} [displayName] - User's display name (optional)
 * @property {string} [email] - User's email address (optional)
 * @property {string} [avatarUrl] - URL to user's avatar image (optional)
 */
interface User {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
}

interface InviteModalProps {
  /** Controls whether the modal is visible */
  isOpen: boolean;
  /** Callback function to close the modal */
  onClose: () => void;
  /** Unique identifier for the room */
  roomId: string;
  /** Display name of the room */
  roomName: string;
  /** Whether the room is publicly accessible */
  isPublic: boolean;
  /** Optional password for private rooms */
  roomPassword?: string;
}

/**
 * InviteModal Component
 * 
 * @component
 * @description
 * A comprehensive modal for inviting collaborators to a room through multiple methods:
 * link sharing, email invites, direct user invitations, and social media sharing.
 * 
 * @features
 * - **Multiple Invite Methods**: Link, email, user search, and social sharing
 * - **Room Access Control**: Handles public/private rooms with password protection
 * - **User Search**: Real-time search of platform users with debouncing
 * - **Bulk Email Invites**: Add multiple email recipients with validation
 * - **Social Media Integration**: One-click sharing to popular platforms
 * - **Copy-to-Clipboard**: Easy copying of links and passwords
 * - **Custom Messages**: Personalized invitation messages
 * - **QR Code Placeholder**: Ready for QR code integration
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <InviteModal
 *   isOpen={isInviteModalOpen}
 *   onClose={() => setIsInviteModalOpen(false)}
 *   roomId="room-123"
 *   roomName="Design Team"
 *   isPublic={true}
 * />
 * 
 * // Private room with password
 * <InviteModal
 *   isOpen={showInviteModal}
 *   onClose={closeInviteModal}
 *   roomId="private-room-456"
 *   roomName="Private Design Session"
 *   isPublic={false}
 *   roomPassword="secret123"
 * />
 * ```
 * 
 * @param {InviteModalProps} props - Component properties
 * @param {boolean} props.isOpen - Modal visibility state
 * @param {() => void} props.onClose - Close handler
 * @param {string} props.roomId - Room identifier
 * @param {string} props.roomName - Room display name
 * @param {boolean} props.isPublic - Public access flag
 * @param {string} [props.roomPassword] - Room password
 * 
 * @returns {JSX.Element | null} Modal component or null if not open
 */
const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  isPublic,
  roomPassword
}) => {
  // Track which item was recently copied to clipboard (for feedback)
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Current active invite method
  const [inviteMethod, setInviteMethod] = useState<'link' | 'email' | 'users' | 'social'>('link');

  // Email invite inputs
  const [emailInput, setEmailInput] = useState<string>('');
  const [emailList, setEmailList] = useState<string[]>([]);

  // Custom invitation message
  const [customMessage, setCustomMessage] = useState<string>(`Join me in "${roomName}" on CanvasCollab!`);

  // User search inputs
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  // Loading states
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSendingInvites, setIsSendingInvites] = useState<boolean>(false);

  /**
   * Generate the room invitation link
   * For private rooms, includes the password as a query parameter
   * 
   * @constant {string} roomLink
   */
  const roomLink: string = `${window.location.origin}/room/${roomId}`;

  /**
   * Full invitation link including password for private rooms
   * 
   * @constant {string} inviteLink
   */
  const inviteLink: string = roomPassword
    ? `${roomLink}?password=${encodeURIComponent(roomPassword)}`
    : roomLink;

  /**
   * Generate default invitation message
   * 
   * @function getDefaultMessage
   * @returns {string} Default invitation message with room name
   */
  const getDefaultMessage = (): string => `Join me in "${roomName}" on CanvasCollab!`;

  /**
   * Debounced user search effect
   * Triggers search when query length is at least 2 characters
   * Debounces to prevent excessive API calls
   */
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const result = await searchUsers(searchQuery);
          if (result.success && result.users) {
            // Filter out already selected users
            const filteredUsers = result.users.filter(
              (user: User) => !selectedUsers.some(selected => selected.id === user.id)
            );
            setSearchResults(filteredUsers);
          }
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUsers]);

  /**
   * Reset all form fields to initial state
   * 
   * @function resetForm
   */
  const resetForm = (): void => {
    setCopiedItem(null);
    setEmailInput('');
    setEmailList([]);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setCustomMessage(getDefaultMessage());
  };

  /**
   * Handle modal close with cleanup
   * 
   * @function handleClose
   */
  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  /**
   * Copy text to clipboard and show feedback
   * 
   * @function copyToClipboard
   * @param {string} text - Text to copy
   * @param {string} item - Identifier for the copied item (for feedback)
   */
  const copyToClipboard = (text: string, item: string): void => {
    navigator.clipboard.writeText(text);
    setCopiedItem(item);
    // Clear feedback after 2 seconds
    setTimeout(() => setCopiedItem(null), 2000);
  };

  /**
   * Add email to the invitation list
   * Validates email format and prevents duplicates
   * 
   * @function handleAddEmail
   */
  const handleAddEmail = (): void => {
    const email = emailInput.trim();
    if (email && validateEmail(email) && !emailList.includes(email)) {
      setEmailList([...emailList, email]);
      setEmailInput('');
    }
  };

  /**
   * Remove email from the invitation list
   * 
   * @function handleRemoveEmail
   * @param {string} emailToRemove - Email address to remove
   */
  const handleRemoveEmail = (emailToRemove: string): void => {
    setEmailList(emailList.filter(email => email !== emailToRemove));
  };

  /**
   * Handle key press in email input
   * Allows adding emails with Enter or comma key
   * 
   * @function handleKeyPress
   * @param {React.KeyboardEvent} e - Keyboard event
   */
  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  /**
   * Validate email format using regex
   * 
   * @function validateEmail
   * @param {string} email - Email address to validate
   * @returns {boolean} True if email is valid
   */
  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  /**
   * Send email invitations (demo/placeholder function)
   * In production, this would call an email API
   * 
   * @function sendEmailInvites
   */
  const sendEmailInvites = (): void => {
    // TODO: Replace with actual email API call
    console.log('Sending invites to:', emailList);
    console.log('Message:', customMessage);
    console.log('Room link:', inviteLink);

    // Demo alert - replace with actual success/error handling
    alert(`Invites sent to ${emailList.length} email(s)`);
    setEmailList([]);
  };

  /**
   * Toggle user selection for direct invitations
   * 
   * @function toggleUserSelection
   * @param {any} user - User object to toggle selection
   */
  const toggleUserSelection = (user: User): void => {
    const isSelected = selectedUsers.some(selected => selected.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  /**
   * Send direct invitations to selected users via API
   * 
   * @function sendUserInvites
   */
  const sendUserInvites = async (): Promise<void> => {
    try {
      setIsSendingInvites(true);
      const userIds = selectedUsers.map(user => user.id);
      const response = await inviteUsersToRoom(roomId, userIds);

      if (response.success) {
        alert(`${response.results.sent} invitation(s) sent successfully!`);
        setSelectedUsers([]);
        setSearchQuery('');
      } else {
        alert(`Failed to send invites: ${response.message}`);
      }
    } catch (error) {
      console.error('Error sending invites:', error);
      alert('An error occurred while sending invites');
    } finally {
      setIsSendingInvites(false);
    }
  };

  /**
   * Open social media sharing dialog for a specific platform
   * 
   * @function shareOnSocial
   * @param {string} platform - Social media platform identifier
   */
  const shareOnSocial = (platform: string): void => {
    const shareText = encodeURIComponent(`${customMessage}\n\nJoin here: ${inviteLink}`);
    let shareUrl = '';

    // Generate platform-specific sharing URLs
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${shareText}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteLink)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${shareText}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(customMessage)}`;
        break;
    }

    // Open sharing dialog in new window
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  // Don't render anything if modal is closed
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 dark:bg-black/90 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-label="Invite collaborators modal"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Share2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Invite Collaborators
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Invite others to join "{roomName}"
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Modal Content - Scrollable area */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Invite Method Selection Tabs */}
          <div className="flex gap-2 mb-6" role="tablist" aria-label="Invitation methods">
            <button
              onClick={() => setInviteMethod('link')}
              className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${inviteMethod === 'link'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              role="tab"
              aria-selected={inviteMethod === 'link'}
              aria-controls="link-panel"
            >
              <Link size={18} />
              Share Link
            </button>
            <button
              onClick={() => setInviteMethod('email')}
              className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${inviteMethod === 'email'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              role="tab"
              aria-selected={inviteMethod === 'email'}
              aria-controls="email-panel"
            >
              <Mail size={18} />
              Email Invites
            </button>
            <button
              onClick={() => setInviteMethod('users')}
              className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${inviteMethod === 'users'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              role="tab"
              aria-selected={inviteMethod === 'users'}
              aria-controls="users-panel"
            >
              <Users size={18} />
              Invite Users
            </button>
            <button
              onClick={() => setInviteMethod('social')}
              className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${inviteMethod === 'social'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              role="tab"
              aria-selected={inviteMethod === 'social'}
              aria-controls="social-panel"
            >
              <Share2 size={18} />
              Social Share
            </button>
          </div>

          {/* Link Sharing Section */}
          {inviteMethod === 'link' && (
            <div id="link-panel" role="tabpanel" aria-labelledby="link-tab" className="space-y-6">
              {/* Room Link with Copy Button */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Room Link
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="w-full pl-4 pr-24 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm"
                    aria-label="Room invitation link"
                  />
                  <Button
                    onClick={() => copyToClipboard(inviteLink, 'link')}
                    className="absolute right-2 top-2 gap-2"
                    aria-label="Copy room link to clipboard"
                  >
                    {copiedItem === 'link' ? <Check size={16} /> : <Copy size={16} />}
                    {copiedItem === 'link' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              {/* Password Section (for private rooms) */}
              {!isPublic && roomPassword && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Room Password
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={roomPassword}
                      readOnly
                      className="w-full pl-4 pr-24 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      aria-label="Room password"
                    />
                    <Button
                      onClick={() => copyToClipboard(roomPassword, 'password')}
                      className="absolute right-2 top-2 gap-2"
                      aria-label="Copy room password to clipboard"
                    >
                      {copiedItem === 'password' ? <Check size={16} /> : <Copy size={16} />}
                      {copiedItem === 'password' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Share both the link and password with invited users
                  </p>
                </div>
              )}

              {/* Access Information Note */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      {isPublic
                        ? 'Anyone with the link can join this public room.'
                        : 'Only users with both the link and password can join this private room.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
                  Quick Join with QR Code
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Live QR Code */}
                  <div
                    id="qr-code-container"
                    className="p-4 bg-white rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <QRCodeSVG
                      value={inviteLink}
                      size={176}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Scan this QR code with a mobile device to join the room instantly.
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => {
                          const svg = document.querySelector('#qr-code-container svg');
                          if (!svg) return;
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas');
                          canvas.width = 512;
                          canvas.height = 512;
                          const ctx = canvas.getContext('2d');
                          const img = new Image();
                          img.onload = () => {
                            if (ctx) {
                              ctx.fillStyle = '#ffffff';
                              ctx.fillRect(0, 0, 512, 512);
                              ctx.drawImage(img, 0, 0, 512, 512);
                              const a = document.createElement('a');
                              a.download = `${roomName.replace(/\s+/g, '_')}_QR.png`;
                              a.href = canvas.toDataURL('image/png');
                              a.click();
                            }
                          };
                          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                        }}
                        variant="outline"
                        className="gap-2"
                      >
                        <Download size={16} />
                        Download QR Code
                      </Button>
                      <Button
                        onClick={() => copyToClipboard(inviteLink, 'qr')}
                        variant="outline"
                        className="gap-2"
                      >
                        {copiedItem === 'qr' ? <Check size={16} /> : <Copy size={16} />}
                        {copiedItem === 'qr' ? 'Copied!' : 'Copy Room Link'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Invites Section */}
          {inviteMethod === 'email' && (
            <div id="email-panel" role="tabpanel" aria-labelledby="email-tab" className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Invite via Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                   
                    className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    aria-label="Email addresses to invite"
                  />
                  <Button onClick={handleAddEmail} className="gap-2">
                    <Mail size={18} />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Press Enter or comma to add multiple emails
                </p>
              </div>

              {/* Email List Display */}
              {emailList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Recipients ({emailList.length})
                  </label>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {emailList.map((email) => (
                        <div
                          key={email}
                          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full"
                        >
                          <span className="text-sm text-slate-700 dark:text-slate-300">{email}</span>
                          <button
                            onClick={() => handleRemoveEmail(email)}
                            className="text-slate-400 hover:text-red-500"
                            aria-label={`Remove ${email}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Message Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Custom Invitation Message
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  rows={3}
                  maxLength={500}
                  aria-label="Custom invitation message"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {customMessage.length}/500 characters
                  </span>
                  <button
                    onClick={() => copyToClipboard(customMessage, 'message')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {copiedItem === 'message' ? 'Copied!' : 'Copy message'}
                  </button>
                </div>
              </div>

              {/* Send Email Invites Button */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  onClick={sendEmailInvites}
                  disabled={emailList.length === 0}
                  className="w-full gap-2"
                  aria-label={`Send invites to ${emailList.length} ${emailList.length === 1 ? 'person' : 'people'}`}
                >
                  <Mail size={18} />
                  Send Invites to {emailList.length} {emailList.length === 1 ? 'Person' : 'People'}
                </Button>
              </div>
            </div>
          )}

          {/* User Invites Section */}
          {inviteMethod === 'users' && (
            <div id="users-panel" role="tabpanel" aria-labelledby="users-tab" className="space-y-6">
              {/* User Search Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Search for Users
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                   
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    aria-label="Search users"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 animate-spin"
                      aria-label="Searching users" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Type at least 2 characters to search
                </p>
              </div>

              {/* Search Results List */}
              {searchQuery.trim().length >= 2 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Available Users ({searchResults.length})
                  </label>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => toggleUserSelection(user)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${selectedUsers.some(u => u.id === user.id)
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            aria-label={`Select ${user.displayName || user.username}`}
                            aria-pressed={selectedUsers.some(u => u.id === user.id)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsers.some(u => u.id === user.id)}
                              readOnly
                              className="w-5 h-5 rounded border-slate-300 cursor-pointer"
                              aria-label={`Select ${user.displayName || user.username}`}
                            />
                            <div className="flex-1 text-left">
                              <p className="font-medium text-slate-900 dark:text-white">
                                {user.displayName || user.username}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                @{user.username}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : !isSearching && (
                      <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                        No users found
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Selected Users Display */}
              {selectedUsers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Selected Users ({selectedUsers.length})
                  </label>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-full"
                        >
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            {user.displayName || user.username}
                          </span>
                          <button
                            onClick={() => toggleUserSelection(user)}
                            className="text-blue-500 hover:text-red-500"
                            aria-label={`Remove ${user.username}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Send User Invites Button */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  onClick={sendUserInvites}
                  disabled={selectedUsers.length === 0 || isSendingInvites}
                  className="w-full gap-2"
                  aria-label={`Send invites to ${selectedUsers.length} selected users`}
                >
                  {isSendingInvites ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Users size={18} />
                  )}
                  {isSendingInvites ? 'Sending...' : `Send Invites to ${selectedUsers.length} ${selectedUsers.length === 1 ? 'User' : 'Users'}`}
                </Button>
              </div>
            </div>
          )}

          {/* Social Sharing Section */}
          {inviteMethod === 'social' && (
            <div id="social-panel" role="tabpanel" aria-labelledby="social-tab" className="space-y-6">
              {/* Social Platform Buttons */}
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
                  Share on Social Media
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Twitter */}
                  <button
                    onClick={() => shareOnSocial('twitter')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col items-center gap-2"
                    aria-label="Share on Twitter"
                  >
                    <Twitter className="w-6 h-6 text-[#1DA1F2]" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Twitter</span>
                  </button>

                  {/* Facebook */}
                  <button
                    onClick={() => shareOnSocial('facebook')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col items-center gap-2"
                    aria-label="Share on Facebook"
                  >
                    <Facebook className="w-6 h-6 text-[#1877F2]" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Facebook</span>
                  </button>

                  {/* LinkedIn */}
                  <button
                    onClick={() => shareOnSocial('linkedin')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col items-center gap-2"
                    aria-label="Share on LinkedIn"
                  >
                    <Linkedin className="w-6 h-6 text-[#0A66C2]" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">LinkedIn</span>
                  </button>

                  {/* WhatsApp */}
                  <button
                    onClick={() => shareOnSocial('whatsapp')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 transition-all flex flex-col items-center gap-2"
                    aria-label="Share on WhatsApp"
                  >
                    <MessageCircle className="w-6 h-6 text-[#25D366]" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">WhatsApp</span>
                  </button>

                  {/* Telegram */}
                  <button
                    onClick={() => shareOnSocial('telegram')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col items-center gap-2"
                    aria-label="Share on Telegram"
                  >
                    <MessageCircle className="w-6 h-6 text-[#0088CC]" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Telegram</span>
                  </button>

                  {/* Copy Link */}
                  <button
                    onClick={() => copyToClipboard(inviteLink, 'social')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col items-center gap-2"
                    aria-label="Copy link to clipboard"
                  >
                    {copiedItem === 'social' ? (
                      <Check className="w-6 h-6 text-green-500" />
                    ) : (
                      <Copy className="w-6 h-6 text-slate-500" />
                    )}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {copiedItem === 'social' ? 'Copied!' : 'Copy Link'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Custom Share Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Share Message
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  rows={2}
                  maxLength={280}
                  aria-label="Social media share message"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This message will be included when sharing. {customMessage.length}/280 characters
                </p>
              </div>

              {/* Direct Link Display */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Direct invitation link:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-white dark:bg-slate-900 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 truncate">
                    {inviteLink}
                  </code>
                  <Button
                    onClick={() => copyToClipboard(inviteLink, 'direct')}
                    className="gap-2"
                    aria-label="Copy direct invitation link"
                  >
                    {copiedItem === 'direct' ? <Check size={16} /> : <Copy size={16} />}
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            {/* Contextual help text */}
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {inviteMethod === 'link' && 'Share the link with anyone you want to collaborate with'}
              {inviteMethod === 'email' && 'Invite specific people via email'}
              {inviteMethod === 'users' && 'Invite other platform users directly'}
              {inviteMethod === 'social' && 'Share with your network on social media'}
            </div>
            {/* Done Button */}
            <Button onClick={handleClose} variant="outline" aria-label="Close modal">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;