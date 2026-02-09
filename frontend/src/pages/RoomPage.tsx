import { useParams } from 'react-router-dom';
import { useState } from 'react';
import InviteModal from '../components/ui/InviteModal';
import ParticipantsPanel from '../features/rooms/ParticipantsPanel';
import { CollaborativeCanvas } from '../features/canvas/CollaborativeCanvas';
import { Sidebar } from '../components/Sidebar';
import { Users, MessageSquare, Share2, Copy, Check } from 'lucide-react';

/**
 * RoomPage component - Main collaborative drawing room interface
 * Provides canvas workspace with collaboration tools and user presence indicators
 */
const RoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  /**
   * Copies the room ID to clipboard
   */
  const copyRoomId = () => {
    if (id) {
      navigator.clipboard.writeText(id);
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
   * In production, this would open/close the chat interface
   */
  const handleToggleChat = () => {
    // In production: Toggle chat panel visibility
    // Example: setChatOpen(!isChatOpen)
    console.log('Toggle chat panel');
  };

  /**
   * Handles user list panel toggle
   * In production, this would show/hide active users
   */
  const handleToggleUserList = () => {
    setShowParticipantsPanel(!showParticipantsPanel);
  };

  // In a real app, you would fetch room data from an API/context
  // For now, using mock data to demonstrate functionality
  const roomData = {
    name: "Architecture Project v1",
    isPublic: true,
    password: undefined
  };

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
                  Room ID: <span className="text-blue-600 dark:text-blue-400 font-semibold">{id}</span>
                </span>
                <button 
                  onClick={copyRoomId}
                  className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-1 rounded font-mono text-slate-600 dark:text-slate-300 transition-colors"
                  aria-label={copied ? "Room ID copied" : "Copy room ID"}
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
            
            {/* Active user avatars */}
            <div className="flex -space-x-2 mr-4">
              <div 
                className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white"
                aria-label="User 1"
                title="User 1"
              >
                US
              </div>
              <div 
                className="w-8 h-8 rounded-full bg-orange-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white"
                aria-label="User 2"
                title="User 2"
              >
                UR
              </div>
              <div 
                className="w-8 h-8 rounded-full bg-purple-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white"
                aria-label="User 3"
                title="User 3"
              >
                +1
              </div>
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
              Room ID: <span className="font-mono font-semibold">{id}</span>
            </span>
            <button 
              onClick={copyRoomId}
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
          roomPassword={roomData.password}
        />
      )}

      {/* Participants Panel */}
      {id && (
        <ParticipantsPanel
          isOpen={showParticipantsPanel}
          onClose={() => setShowParticipantsPanel(false)}
          roomId={id}
          currentUserId="current-user-id"
          currentUserRole="owner"
          socket={socket}
        />
      )}
    </div>
  );
};

export default RoomPage;