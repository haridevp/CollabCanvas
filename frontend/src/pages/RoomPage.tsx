import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import InviteModal from '../components/ui/InviteModal';
import ParticipantsPanel from '../features/rooms/ParticipantsPanel';
import { CollaborativeCanvas } from '../features/canvas/CollaborativeCanvas';
import { useAuth } from '../services/AuthContext';
import roomService from '../services/roomService';
import { Users, MessageSquare, Share2, Copy, Check, Loader2, AlertCircle } from 'lucide-react';

/**
 * RoomPage component - Main collaborative drawing room interface
 * Provides canvas workspace with collaboration tools and user presence indicators
 * 
 * Fetches real room data from backend and uses auth context for current user info.
 */
const RoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [copied, setCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  // Room data from backend
  const [roomData, setRoomData] = useState<{
    name: string;
    description: string;
    isPublic: boolean;
    ownerId: string;
    ownerName: string;
    participantCount: number;
    roomCode: string;
    requiresPassword?: boolean;
    isAlreadyMember?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current user info from auth context
  const currentUserId = user?.id || '';
  const currentUserRole: 'owner' | 'moderator' | 'participant' =
    roomData?.ownerId === currentUserId ? 'owner' : 'participant';

  // Fetch room data from backend on mount
  useEffect(() => {
    if (!id) return;

    const fetchRoom = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await roomService.getRoom(id);
        if (result.success && result.room) {
          setRoomData({
            name: result.room.name,
            description: result.room.description,
            isPublic: result.room.isPublic,
            ownerId: result.room.ownerId,
            ownerName: result.room.ownerName,
            participantCount: result.room.participantCount,
            roomCode: result.room.roomCode || '',
            requiresPassword: (result.room as any).requiresPassword,
            isAlreadyMember: (result.room as any).isAlreadyMember,
          });
        } else {
          setError(result.message || 'Room not found');
        }
      } catch (err) {
        setError('Failed to load room. Please try again.');
        console.error('Failed to fetch room:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [id]);

  /**
   * Copies the room code to clipboard for sharing with other users
   */
  const copyRoomCode = () => {
    const code = roomData?.roomCode || id || '';
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Handles room sharing functionality - Opens the invite modal
   */
  const handleShareRoom = () => {
    setShowInviteModal(true);
  };

  /**
   * Handles chat panel toggle
   */
  const handleToggleChat = () => {
    console.log('Toggle chat panel');
  };

  /**
   * Handles user list panel toggle
   */
  const handleToggleUserList = () => {
    setShowParticipantsPanel(!showParticipantsPanel);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Loading room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !roomData) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Unable to Load Room
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {error || 'Room not found or you may not have access.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-900">
      {/* Main workspace area */}
      <div className="flex-1 flex flex-col">
        
        {/* Room header with controls */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between px-6">
          
          {/* Room title, ID, and status */}
          <div className="flex items-center gap-4">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white">{roomData.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Room Code: <span className="text-blue-600 dark:text-blue-400 font-semibold">{roomData.roomCode || id}</span>
                </span>
                <button 
                  onClick={copyRoomCode}
                  className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-1 rounded font-mono text-slate-600 dark:text-slate-300 transition-colors"
                  aria-label={copied ? "Room code copied" : "Copy room code"}
                >
                  {copied ? (
                    <>
                      <Check size={12} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>
            <span 
              className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full font-medium"
              aria-label="Room is live and active"
            >
              Live
            </span>
          </div>
          
          {/* Collaboration controls */}
          <div className="flex items-center gap-3">
            
            {/* Participant count badge */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mr-2">
              <Users size={16} />
              <span>{roomData.participantCount}</span>
            </div>
            
            {/* Share/Invite room button */}
            <button 
              onClick={handleShareRoom}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-2"
              aria-label="Invite users to room"
              title="Invite users"
            >
              <Share2 size={20} aria-hidden="true" />
              <span className="text-sm font-medium hidden md:inline">Invite</span>
            </button>
            
            {/* Chat toggle button */}
            <button 
              onClick={handleToggleChat}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-2"
              aria-label="Open chat"
              title="Open chat"
            >
              <MessageSquare size={20} aria-hidden="true" />
              <span className="text-sm font-medium hidden md:inline">Chat</span>
            </button>
            
            {/* Users list toggle button */}
            <button 
              onClick={handleToggleUserList}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-2"
              aria-label="Show active users"
              title="Show active users"
            >
              <Users size={20} aria-hidden="true" />
              <span className="text-sm font-medium hidden md:inline">Users</span>
            </button>
          </div>
        </header>
        
        {/* Room ID info banner (mobile/compact view) */}
        <div className="md:hidden px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Room Code: <span className="font-mono font-semibold">{roomData.roomCode || id}</span>
            </span>
            <button 
              onClick={copyRoomCode}
              className="text-xs bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 px-2 py-1 rounded text-blue-700 dark:text-blue-300 transition-colors flex items-center gap-1"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        
        {/* Main canvas area */}
        <div className="flex-1 relative">
          <CollaborativeCanvas roomId={id} />
        </div>
      </div>

      {/* Invite Users Modal */}
      {id && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          roomId={id}
          roomName={roomData.name}
          isPublic={roomData.isPublic}
          roomPassword={undefined}
        />
      )}

      {/* Participants Panel */}
      {id && (
        <ParticipantsPanel
          isOpen={showParticipantsPanel}
          onClose={() => setShowParticipantsPanel(false)}
          roomId={id}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          socket={socket}
        />
      )}
    </div>
  );
};

export default RoomPage;