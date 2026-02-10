import React, { useState, useEffect, useCallback } from 'react';
import type { JSX } from 'react';
import { 
  Users, Crown, Shield, User, MoreVertical, Mic, MicOff, 
  Video, VideoOff, MessageSquare, Ban, UserX, UserCheck,
  Search, Filter, Loader2, LogOut, UserMinus
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import roomService from '../../services/roomService';

/**
 * Represents a participant in a room
 * @interface Participant
 */
interface Participant {
  /** Unique identifier for the participant record */
  id: string;
  /** User ID of the participant */
  userId: string;
  /** Display name of the participant */
  username: string;
  /** Email address of the participant */
  email: string;
  /** Role within the room */
  role: 'owner' | 'moderator' | 'participant';
  /** ISO timestamp when the participant joined */
  joinedAt: string;
  /** ISO timestamp of last activity */
  lastActive: string;
  /** Whether the participant's audio is enabled (optional) */
  isAudioEnabled?: boolean;
  /** Whether the participant's video is enabled (optional) */
  isVideoEnabled?: boolean;
  /** Whether the participant is currently typing (optional) */
  isTyping?: boolean;
  /** URL to participant's avatar image (optional) */
  avatar?: string;
}

/**
 * Props for the ParticipantsPanel component
 * @interface ParticipantsPanelProps
 */
interface ParticipantsPanelProps {
  /** ID of the room to show participants for */
  roomId: string;
  /** Current user's ID for permission checks */
  currentUserId: string;
  /** Current user's role for permission checks */
  currentUserRole: 'owner' | 'moderator' | 'participant';
  /** Controls whether the panel is visible */
  isOpen: boolean;
  /** Callback when panel is closed */
  onClose: () => void;
  /** Optional callback for participant actions */
  onParticipantAction?: (action: string, participantId: string) => void;
  /** Socket.IO instance for real-time updates (optional) */
  socket?: any;
}

/**
 * Available participant management actions
 * @typedef {'promote' | 'demote' | 'kick' | 'ban'} ParticipantAction
 */
type ParticipantAction = 'promote' | 'demote' | 'kick' | 'ban';

/**
 * Filter options for participant roles
 * @typedef {'all' | 'owner' | 'moderator' | 'participant'} RoleFilter
 */
type RoleFilter = 'all' | 'owner' | 'moderator' | 'participant';

/**
 * Type for grouped participants by role
 * @interface GroupedParticipants
 */
interface GroupedParticipants {
  /** Participants with owner role */
  owner: Participant[];
  /** Participants with moderator role */
  moderator: Participant[];
  /** Participants with participant role */
  participant: Participant[];
}

/**
 * Type for confirmation dialog state
 * @interface ConfirmActionState
 */
interface ConfirmActionState {
  /** Action to confirm */
  action: ParticipantAction;
  /** Participant to act upon */
  participant: Participant;
}

/**
 * A panel component for displaying and managing room participants
 * 
 * @component
 * @example
 * ```tsx
 * <ParticipantsPanel
 *   roomId="room-123"
 *   currentUserId="user-456"
 *   currentUserRole="moderator"
 *   isOpen={true}
 *   onClose={() => setIsOpen(false)}
 *   onParticipantAction={(action, userId) => {
 *     console.log(`Action ${action} on user ${userId}`);
 *   }}
 * />
 * ```
 */
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
  const [filterRole, setFilterRole] = useState<RoleFilter>('all');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);

  /**
   * Load participants when panel opens or room changes
   */
  useEffect(() => {
    if (isOpen && roomId) {
      loadParticipants();
    }
  }, [isOpen, roomId]);

  /**
   * Listen for real-time participant updates via Socket.IO
   */
  useEffect(() => {
    if (!socket) return;

    /**
     * Handles real-time participant updates from the server
     * @param {any} data - Socket data containing updated participants
     */
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

  /**
   * Loads participants from the room service
   * 
   * @async
   * @function loadParticipants
   * @returns {Promise<void>}
   */
  const loadParticipants = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await roomService.getParticipants(roomId);
      if (result.success && result.participants) {
        setParticipants(result.participants);
      }
    } catch (error) {
      console.error('Failed to load participants:', error);
      // TODO: Add error notification to user
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles participant management actions
   * 
   * @async
   * @function handleParticipantAction
   * @param {ParticipantAction} action - Action to perform
   * @param {Participant} participant - Target participant
   * @returns {Promise<void>}
   */
  const handleParticipantAction = async (
    action: ParticipantAction, 
    participant: Participant
  ): Promise<void> => {
    // Prevent self-modification
    if (participant.userId === currentUserId) return;

    // Require confirmation for destructive actions
    if (action === 'kick' || action === 'ban') {
      setConfirmAction({ action, participant });
      return;
    }

    try {
      const result = await roomService.manageParticipant(
        roomId,
        participant.userId,
        action
      );

      if (result.success) {
        // Update local state
        setParticipants(prev => prev.map(p => {
          if (p.userId === participant.userId) {
            if (action === 'promote') {
              return { ...p, role: 'moderator' };
            } else if (action === 'demote') {
              return { ...p, role: 'participant' };
            }
          }
          return p;
        }));

        // Notify parent component
        if (onParticipantAction) {
          onParticipantAction(action, participant.userId);
        }
      }

      setShowActionMenu(null);
      setSelectedParticipant(null);
    } catch (error) {
      console.error('Failed to perform action:', error);
      // TODO: Add error notification
    }
  };

  /**
   * Executes a confirmed destructive action
   * 
   * @async
   * @function confirmAndExecuteAction
   * @returns {Promise<void>}
   */
  const confirmAndExecuteAction = async (): Promise<void> => {
    if (!confirmAction) return;

    try {
      const result = await roomService.manageParticipant(
        roomId,
        confirmAction.participant.userId,
        confirmAction.action
      );

      if (result.success) {
        // Remove participant from local state
        if (confirmAction.action === 'kick' || confirmAction.action === 'ban') {
          setParticipants(prev => 
            prev.filter(p => p.userId !== confirmAction!.participant.userId)
          );
        }

        // Notify parent component
        if (onParticipantAction) {
          onParticipantAction(confirmAction.action, confirmAction.participant.userId);
        }
      }

      setConfirmAction(null);
      setShowActionMenu(null);
      setSelectedParticipant(null);
    } catch (error) {
      console.error('Failed to perform action:', error);
      // TODO: Add error notification
    }
  };

  /**
   * Gets the appropriate icon for a participant role
   * 
   * @function getRoleIcon
   * @param {string} role - Participant role
   * @returns {JSX.Element} Icon component
   */
  const getRoleIcon = (role: string): JSX.Element => {
    switch (role) {
      case 'owner': 
        return <Crown className="w-4 h-4 text-yellow-500" aria-label="Room Owner" />;
      case 'moderator': 
        return <Shield className="w-4 h-4 text-blue-500" aria-label="Moderator" />;
      default: 
        return <User className="w-4 h-4 text-slate-400" aria-label="Participant" />;
    }
  };

  /**
   * Gets the human-readable label for a role
   * 
   * @function getRoleLabel
   * @param {string} role - Participant role
   * @returns {string} Role label
   */
  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'moderator': return 'Moderator';
      default: return 'Participant';
    }
  };

  /**
   * Formats a date string into a human-readable time ago format
   * 
   * @function formatTimeAgo
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted time string
   */
  const formatTimeAgo = (dateString: string): string => {
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

  /**
   * Filters and groups participants based on current filters
   * 
   * @function getFilteredAndGroupedParticipants
   * @returns {GroupedParticipants} Grouped participants
   */
  const getFilteredAndGroupedParticipants = useCallback((): GroupedParticipants => {
    const filtered = participants.filter(participant => {
      const matchesSearch = 
        participant.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        participant.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = filterRole === 'all' || participant.role === filterRole;
      
      return matchesSearch && matchesRole;
    });

    return {
      owner: filtered.filter(p => p.role === 'owner'),
      moderator: filtered.filter(p => p.role === 'moderator'),
      participant: filtered.filter(p => p.role === 'participant')
    };
  }, [participants, searchQuery, filterRole]);

  const groupedParticipants = getFilteredAndGroupedParticipants();
  const filteredParticipants = React.useMemo(() => [
    ...groupedParticipants.owner,
    ...groupedParticipants.moderator,
    ...groupedParticipants.participant
  ], [groupedParticipants]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Participants ({participants.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close participants panel"
          >
            <UserX className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" />
            <input
              type="text"
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search participants"
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
              aria-label="Show all participants"
              aria-pressed={filterRole === 'all'}
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
              aria-label="Show room owners"
              aria-pressed={filterRole === 'owner'}
            >
              <Crown size={14} aria-hidden="true" /> Owners
            </button>
            <button
              onClick={() => setFilterRole('participant')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterRole === 'participant'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              aria-label="Show regular participants"
              aria-pressed={filterRole === 'participant'}
            >
              Participants
            </button>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" aria-live="polite">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading participants...</span>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" aria-hidden="true" />
            <p className="text-slate-500 dark:text-slate-400">
              {searchQuery ? 'No participants found' : 'No participants in the room'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Owners */}
            {groupedParticipants.owner.length > 0 && (
              <div role="group" aria-label="Room owners">
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
              <div role="group" aria-label="Moderators">
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
              <div role="group" aria-label="Participants">
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
                    aria-label={`Promote ${selectedParticipant.username} to moderator`}
                  >
                    <Shield className="w-5 h-5 text-blue-500" aria-hidden="true" />
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
                    aria-label={`Demote ${selectedParticipant.username} to participant`}
                  >
                    <User className="w-5 h-5 text-slate-500" aria-hidden="true" />
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
                      aria-label={`Kick ${selectedParticipant.username} from room`}
                    >
                      <LogOut className="w-5 h-5" aria-hidden="true" />
                      <div>
                        <p className="font-medium">Kick from Room</p>
                        <p className="text-xs">Remove temporarily (can rejoin)</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleParticipantAction('ban', selectedParticipant)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
                      aria-label={`Ban ${selectedParticipant.username} permanently`}
                    >
                      <Ban className="w-5 h-5" aria-hidden="true" />
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
                  aria-label="Cancel management"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // TODO: Implement private messaging
                    console.log('Send message to', selectedParticipant.username);
                    setShowActionMenu(null);
                  }}
                  className="flex-1"
                  aria-label={`Send private message to ${selectedParticipant.username}`}
                >
                  <MessageSquare size={16} className="mr-2" aria-hidden="true" />
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
                  aria-label="Cancel action"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAndExecuteAction}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  aria-label={`Confirm ${confirmAction.action} ${confirmAction.participant.username}`}
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

/**
 * Props for the ParticipantItem component
 * @interface ParticipantItemProps
 */
interface ParticipantItemProps {
  /** Participant data */
  participant: Participant;
  /** Current user's ID */
  currentUserId: string;
  /** Current user's role */
  currentUserRole: string;
  /** Callback when action button is clicked */
  onActionClick: (participant: Participant) => void;
  /** Whether action menu is shown for this participant */
  showActionMenu: boolean;
  /** Callback to close action menu */
  onCloseMenu: () => void;
  /** Function to get role icon */
  getRoleIcon: (role: string) => JSX.Element;
  /** Function to format time ago */
  formatTimeAgo: (dateString: string) => string;
}

/**
 * Individual participant item component
 * 
 * @component
 * @param {ParticipantItemProps} props - Component props
 * @returns {JSX.Element} Rendered participant item
 */
const ParticipantItem: React.FC<ParticipantItemProps> = ({ 
  participant, 
  currentUserId, 
  currentUserRole, 
  onActionClick, 
  showActionMenu, 
  onCloseMenu,
  getRoleIcon,
  formatTimeAgo
}): JSX.Element => {
  const isCurrentUser = participant.userId === currentUserId;
  const canManage = 
    !isCurrentUser && 
    (currentUserRole === 'owner' || 
     (currentUserRole === 'moderator' && participant.role === 'participant'));

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg ${
        isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
      role="listitem"
      aria-label={`Participant: ${participant.username}, Role: ${participant.role}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative">
          <div 
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold"
            aria-hidden="true"
          >
            {participant.username.charAt(0).toUpperCase()}
          </div>
          {participant.isAudioEnabled !== undefined && (
            <div className="absolute -bottom-1 -right-1">
              {participant.isAudioEnabled ? (
                <div 
                  className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                  aria-label="Audio enabled"
                >
                  <Mic className="w-3 h-3 text-white" aria-hidden="true" />
                </div>
              ) : (
                <div 
                  className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                  aria-label="Audio disabled"
                >
                  <MicOff className="w-3 h-3 text-white" aria-hidden="true" />
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
              <span className="flex items-center gap-1 text-blue-500" aria-label="Typing...">
                <MessageSquare size={10} aria-hidden="true" />
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
            aria-label={`Manage ${participant.username}`}
            aria-expanded={showActionMenu}
            aria-haspopup="menu"
          >
            <MoreVertical className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ParticipantsPanel;