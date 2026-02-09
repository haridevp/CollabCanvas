// src/components/ui/InviteModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, Mail, Link, Users, Share2, MessageSquare,
  Facebook, Twitter, Linkedin, MessageCircle, Search, Loader2,
} from 'lucide-react';
import { Button } from './Button';
import { searchUsers, inviteUsersToRoom } from '../../utils/authService';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  isPublic: boolean;
  roomPassword?: string;
}

const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  isPublic,
  roomPassword
}) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [inviteMethod, setInviteMethod] = useState<'link' | 'email' | 'users' | 'social'>('link');
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState(`Join me in "${roomName}" on CanvasCollab!`);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  const roomLink = `${window.location.origin}/room/${roomId}`;
  const inviteLink = roomPassword 
    ? `${roomLink}?password=${encodeURIComponent(roomPassword)}`
    : roomLink;

  const getDefaultMessage = () => `Join me in "${roomName}" on CanvasCollab!`;

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const result = await searchUsers(searchQuery);
          if (result.success && result.users) {
            const filteredUsers = result.users.filter(
              user => !selectedUsers.some(selected => selected.id === user.id)
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
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUsers]);

  const resetForm = () => {
    setCopiedItem(null);
    setEmailInput('');
    setEmailList([]);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setCustomMessage(getDefaultMessage());
  };

  const handleClose = () => {
    resetForm();
    onClose(); // whatever closes the modal
  };

  const copyToClipboard = (text: string, item: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(item);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (email && validateEmail(email) && !emailList.includes(email)) {
      setEmailList([...emailList, email]);
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmailList(emailList.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const sendEmailInvites = () => {
    // In production, this would call an API to send emails
    console.log('Sending invites to:', emailList);
    console.log('Message:', customMessage);
    console.log('Room link:', inviteLink);

    alert(`Invites sent to ${emailList.length} email(s)`);
    setEmailList([]);
  };

  const toggleUserSelection = (user: any) => {
    const isSelected = selectedUsers.some(selected => selected.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const sendUserInvites = async () => {
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

  const shareOnSocial = (platform: string) => {
    const shareText = encodeURIComponent(`${customMessage}\n\nJoin here: ${inviteLink}`);
    let shareUrl = '';

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

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 dark:bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Invite Method Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setInviteMethod('link')}
              className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                inviteMethod === 'link'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Link size={18} />
              Share Link
            </button>
            <button
              onClick={() => setInviteMethod('email')}
              className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                inviteMethod === 'email'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Mail size={18} />
              Email Invites
            </button>
            <button
              onClick={() => setInviteMethod('users')}
              className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                inviteMethod === 'users'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Users size={18} />
              Invite Users
            </button>
            <button
              onClick={() => setInviteMethod('social')}
              className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                inviteMethod === 'social'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Share2 size={18} />
              Social Share
            </button>
          </div>

          {/* Link Sharing Section */}
          {inviteMethod === 'link' && (
            <div className="space-y-6">
              <div className="space-y-4">
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
                    />
                    <Button
                      onClick={() => copyToClipboard(inviteLink, 'link')}
                      className="absolute right-2 top-2 gap-2"
                    >
                      {copiedItem === 'link' ? <Check size={16} /> : <Copy size={16} />}
                      {copiedItem === 'link' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>

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
                      />
                      <Button
                        onClick={() => copyToClipboard(roomPassword, 'password')}
                        className="absolute right-2 top-2 gap-2"
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
              </div>

              {/* QR Code Section (placeholder) */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
                  Quick Join with QR Code
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-48 h-48 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-slate-400 dark:text-slate-500 mb-2">QR Code</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        (In production, generate QR for: {roomLink})
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Scan this QR code with a mobile device to join the room instantly.
                    </p>
                    <Button
                      onClick={() => copyToClipboard(roomLink, 'qr')}
                      variant="outline"
                      className="gap-2"
                    >
                      {copiedItem === 'qr' ? <Check size={16} /> : <Copy size={16} />}
                      Copy Link for QR Generation
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Invites Section */}
          {inviteMethod === 'email' && (
            <div className="space-y-6">
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
                    placeholder="Enter email addresses (comma separated)"
                    className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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

              {/* Email List */}
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

              {/* Custom Message */}
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

              {/* Send Button */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  onClick={sendEmailInvites}
                  disabled={emailList.length === 0}
                  className="w-full gap-2"
                >
                  <Mail size={18} />
                  Send Invites to {emailList.length} {emailList.length === 1 ? 'Person' : 'People'}
                </Button>
              </div>
            </div>
          )}

          {/* User Invites Section */}
          {inviteMethod === 'users' && (
            <div className="space-y-6">
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
                    placeholder="Search by username or name..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 animate-spin" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Type at least 2 characters to search
                </p>
              </div>

              {/* Search Results */}
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
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                              selectedUsers.some(u => u.id === user.id)
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsers.some(u => u.id === user.id)}
                              readOnly
                              className="w-5 h-5 rounded border-slate-300 cursor-pointer"
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

              {/* Selected Users */}
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

              {/* Send Button */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  onClick={sendUserInvites}
                  disabled={selectedUsers.length === 0 || isSendingInvites}
                  className="w-full gap-2"
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
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
                  Share on Social Media
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => shareOnSocial('twitter')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col items-center gap-2"
                  >
                    <Twitter className="w-6 h-6 text-[#1DA1F2]" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Twitter</span>
                  </button>

                  <button
                    onClick={() => shareOnSocial('facebook')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col items-center gap-2"
                  >
                    <Facebook className="w-6 h-6 text-[#1877F2]" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Facebook</span>
                  </button>

                  <button
                    onClick={() => shareOnSocial('linkedin')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col items-center gap-2"
                  >
                    <Linkedin className="w-6 h-6 text-[#0A66C2]" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">LinkedIn</span>
                  </button>

                  <button
                    onClick={() => shareOnSocial('whatsapp')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 transition-all flex flex-col items-center gap-2"
                  >
                    <MessageCircle className="w-6 h-6 text-[#25D366]" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">WhatsApp</span>
                  </button>

                  <button
                    onClick={() => shareOnSocial('telegram')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col items-center gap-2"
                  >
                    <MessageCircle className="w-6 h-6 text-[#0088CC]" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Telegram</span>
                  </button>

                  <button
                    onClick={() => copyToClipboard(inviteLink, 'social')}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col items-center gap-2"
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

              {/* Custom Message for Social */}
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
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This message will be included when sharing. {customMessage.length}/280 characters
                </p>
              </div>

              {/* Direct Link */}
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
                  >
                    {copiedItem === 'direct' ? <Check size={16} /> : <Copy size={16} />}
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {inviteMethod === 'link' && 'Share the link with anyone you want to collaborate with'}
              {inviteMethod === 'email' && 'Invite specific people via email'}
              {inviteMethod === 'users' && 'Invite other platform users directly'}
              {inviteMethod === 'social' && 'Share with your network on social media'}
            </div>
            <Button onClick={handleClose} variant="outline">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;