// src/features/rooms/ParticipantsPanel.tsx
import React, { useState, useEffect } from 'react';
import type { JSX } from 'react';
import { 
  Users, Crown, Shield, User, MoreVertical, Mic, MicOff, 
  Video, VideoOff, MessageSquare, Ban, UserX, UserCheck,
  Search, Filter, Loader2, LogOut, UserMinus
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import roomService from '../../services/roomService';

interface Participant {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: 'owner' | 'moderator' | 'participant';
  joinedAt: string;
  lastActive: string;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isTyping?: boolean;
  avatar?: string;
}

interface ParticipantsPanelProps {
  roomId: string;
  currentUserId: string;
  currentUserRole: 'owner' | 'moderator' | 'participant';
  isOpen: boolean;
  onClose: () => void;
  onParticipantAction?: (action: string, participantId: string) => void;
  socket?: any;
}

const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  roomId,
  currentUserId,
  currentUserRole,
  isOpen,
  onClose,
  onParticipantAction,
  socket
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ action: string; participant: Participant } | null>(null);

  useEffect(() => {
    if (isOpen && roomId) {
      loadParticipants();
    }
  }, [isOpen, roomId]);

  // Listen for real-time participant updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleParticipantsUpdated = (data: any) => {
      if (data.participants) {
        setParticipants(data.participants);
      }
    };

    socket.on('participants-updated', handleParticipantsUpdated);

    return () => {
      socket.off('participants-updated', handleParticipantsUpdated);
    };
  }, [socket]);

  const loadParticipants = async () => {
    setIsLoading(true);
    try {
      const result = await roomService.getParticipants(roomId);
      if (result.success && result.participants) {
        setParticipants(result.participants);
      }
    } catch (error) {
      console.error('Failed to load participants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParticipantAction = async (action: string, participant: Participant) => {
    // Require confirmation for destructive actions
    if (action === 'kick' || action === 'ban') {
      setConfirmAction({ action, participant });
      return;
    }

    // For non-destructive actions, execute immediately
    if (participant.userId === currentUserId) return;

    try {
      const result = await roomService.manageParticipant(
        roomId,
        participant.userId,
        action as any
      );

      if (result.success) {
        if (action === 'promote') {
          setParticipants(prev => prev.map(p =>
            p.userId === participant.userId ? { ...p, role: 'moderator' } : p
          ));
        } else if (action === 'demote') {
          setParticipants(prev => prev.map(p =>
            p.userId === participant.userId ? { ...p, role: 'participant' } : p
          ));
        }

        if (onParticipantAction) {
          onParticipantAction(action, participant.userId);
        }
      }

      setShowActionMenu(null);
      setSelectedParticipant(null);
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  const confirmAndExecuteAction = async () => {
    if (!confirmAction) return;

    try {
      const result = await roomService.manageParticipant(
        roomId,
        confirmAction.participant.userId,
        confirmAction.action as any
      );

      if (result.success) {
        if (confirmAction.action === 'kick' || confirmAction.action === 'ban') {
          setParticipants(prev => prev.filter(p => p.userId !== confirmAction.participant.userId));
        }

        if (onParticipantAction) {
          onParticipantAction(confirmAction.action, confirmAction.participant.userId);
        }
      }

      setConfirmAction(null);
      setShowActionMenu(null);
      setSelectedParticipant(null);
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'moderator': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'moderator': return 'Moderator';
      default: return 'Participant';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = 
      participant.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || participant.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const groupedParticipants = {
    owner: filteredParticipants.filter(p => p.role === 'owner'),
    moderator: filteredParticipants.filter(p => p.role === 'moderator'),
    participant: filteredParticipants.filter(p => p.role === 'participant')
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Participants ({participants.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close panel"
          >
            <UserX className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterRole('all')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterRole === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterRole('owner')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                filterRole === 'owner'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Crown size={14} /> Owners
            </button>
            <button
              onClick={() => setFilterRole('participant')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterRole === 'participant'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Participants
            </button>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              {searchQuery ? 'No participants found' : 'No participants in the room'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Owners */}
            {groupedParticipants.owner.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Room Owner
                </h3>
                <div className="space-y-2">
                  {groupedParticipants.owner.map((participant) => (
                    <ParticipantItem
                      key={participant.id}
                      participant={participant}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                      onActionClick={(participant) => {
                        setSelectedParticipant(participant);
                        setShowActionMenu(participant.id);
                      }}
                      showActionMenu={showActionMenu === participant.id}
                      onCloseMenu={() => setShowActionMenu(null)}
                      getRoleIcon={getRoleIcon}
                      formatTimeAgo={formatTimeAgo}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Moderators */}
            {groupedParticipants.moderator.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Moderators ({groupedParticipants.moderator.length})
                </h3>
                <div className="space-y-2">
                  {groupedParticipants.moderator.map((participant) => (
                    <ParticipantItem
                      key={participant.id}
                      participant={participant}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                      onActionClick={(participant) => {
                        setSelectedParticipant(participant);
                        setShowActionMenu(participant.id);
                      }}
                      showActionMenu={showActionMenu === participant.id}
                      onCloseMenu={() => setShowActionMenu(null)}
                      getRoleIcon={getRoleIcon}
                      formatTimeAgo={formatTimeAgo}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Participants */}
            {groupedParticipants.participant.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Participants ({groupedParticipants.participant.length})
                </h3>
                <div className="space-y-2">
                  {groupedParticipants.participant.map((participant) => (
                    <ParticipantItem
                      key={participant.id}
                      participant={participant}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                      onActionClick={(participant) => {
                        setSelectedParticipant(participant);
                        setShowActionMenu(participant.id);
                      }}
                      showActionMenu={showActionMenu === participant.id}
                      onCloseMenu={() => setShowActionMenu(null)}
                      getRoleIcon={getRoleIcon}
                      formatTimeAgo={formatTimeAgo}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Menu Modal */}
      {selectedParticipant && showActionMenu && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                Manage {selectedParticipant.username}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Role: {getRoleLabel(selectedParticipant.role)}
              </p>

              <div className="space-y-2">
                {selectedParticipant.role === 'participant' && currentUserRole === 'owner' && (
                  <button
                    onClick={() => handleParticipantAction('promote', selectedParticipant)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Shield className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Promote to Moderator</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Grant moderation privileges</p>
                    </div>
                  </button>
                )}

                {selectedParticipant.role === 'moderator' && currentUserRole === 'owner' && (
                  <button
                    onClick={() => handleParticipantAction('demote', selectedParticipant)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <User className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Demote to Participant</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Remove moderation privileges</p>
                    </div>
                  </button>
                )}

                {(currentUserRole === 'owner' || currentUserRole === 'moderator') && (
                  <>
                    <button
                      onClick={() => handleParticipantAction('kick', selectedParticipant)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
                    >
                      <LogOut className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Kick from Room</p>
                        <p className="text-xs">Remove temporarily (can rejoin)</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleParticipantAction('ban', selectedParticipant)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
                    >
                      <Ban className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Ban Permanently</p>
                        <p className="text-xs">Prevent from rejoining</p>
                      </div>
                    </button>
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  onClick={() => setShowActionMenu(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Send private message functionality
                    console.log('Send message to', selectedParticipant.username);
                    setShowActionMenu(null);
                  }}
                  className="flex-1"
                >
                  <MessageSquare size={16} className="mr-2" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Destructive Actions */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                {confirmAction.action === 'kick' ? 'Kick Participant?' : 'Ban Participant?'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {confirmAction.action === 'kick'
                  ? `Are you sure you want to kick ${confirmAction.participant.username}? They can rejoin the room later.`
                  : `Are you sure you want to ban ${confirmAction.participant.username}? They will be prevented from rejoining until unbanned.`}
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={() => setConfirmAction(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAndExecuteAction}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {confirmAction.action === 'kick' ? 'Kick' : 'Ban'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Participant Item Component
interface ParticipantItemProps {
  participant: Participant;
  currentUserId: string;
  currentUserRole: string;
  onActionClick: (participant: Participant) => void;
  showActionMenu: boolean;
  onCloseMenu: () => void;
  getRoleIcon: (role: string) => JSX.Element;
  formatTimeAgo: (dateString: string) => string;
}

// Update the ParticipantItem component at the end of the file:

// Participant Item Component
interface ParticipantItemProps {
  participant: Participant;
  currentUserId: string;
  currentUserRole: string;
  onActionClick: (participant: Participant) => void;
  showActionMenu: boolean;
  onCloseMenu: () => void;
  getRoleIcon: (role: string) => React.JSX.Element;
  formatTimeAgo: (dateString: string) => string;
}

const ParticipantItem: React.FC<ParticipantItemProps> = ({ 
  participant, 
  currentUserId, 
  currentUserRole, 
  onActionClick, 
  showActionMenu, 
  onCloseMenu,
  getRoleIcon,
  formatTimeAgo
}): React.JSX.Element => {
  const isCurrentUser = participant.userId === currentUserId;
  const canManage = 
    !isCurrentUser && 
    (currentUserRole === 'owner' || 
     (currentUserRole === 'moderator' && participant.role === 'participant'));

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
    }`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {participant.username.charAt(0).toUpperCase()}
          </div>
          {participant.isAudioEnabled !== undefined && (
            <div className="absolute -bottom-1 -right-1">
              {participant.isAudioEnabled ? (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <Mic className="w-3 h-3 text-white" />
                </div>
              ) : (
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <MicOff className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium truncate ${
              isCurrentUser 
                ? 'text-blue-700 dark:text-blue-300' 
                : 'text-slate-900 dark:text-white'
            }`}>
              {participant.username}
              {isCurrentUser && ' (You)'}
            </span>
            {getRoleIcon(participant.role)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Active {formatTimeAgo(participant.lastActive)}</span>
            {participant.isTyping && (
              <span className="flex items-center gap-1 text-blue-500">
                <MessageSquare size={10} />
                typing...
              </span>
            )}
          </div>
        </div>
      </div>

      {canManage && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActionClick(participant);
            }}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Manage participant"
          >
            <MoreVertical className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ParticipantsPanel;