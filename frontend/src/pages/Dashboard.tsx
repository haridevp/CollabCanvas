import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Plus, Search, Filter, Lock, Globe } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../services/AuthContext';

/**
 * Dashboard component - Main dashboard page displaying user's drawing rooms
 * Provides room management interface with search, filters, and room grid
 */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Handles room creation form submission
   * Generates random room ID and navigates to new room
   * @param e - Form submit event
   */
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const roomId = Math.random().toString(36).substring(7); // Generate random ID
    // In a real app, you'd save this to a database here
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar navigation */}
      <Sidebar />
      
      {/* Main content area */}
      <main className="flex-1 p-8">
        {/* Dashboard header with greeting and new room button */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              My Drawing Rooms
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Welcome back, {user?.name || 'User'}
            </p>
          </div>
          <Button 
            className="gap-2" 
            onClick={() => setIsModalOpen(true)}
            aria-label="Create new room"
          >
            <Plus size={20} /> New Room
          </Button>
        </header>

        {/* Room search and filter controls */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search your rooms..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
              aria-label="Search rooms"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter size={18} /> Filter
          </Button>
        </div>

        {/* Room grid displaying user's drawing rooms */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Example room card - in production, this would be mapped from data */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-slate-900/50 transition-shadow cursor-pointer">
            {/* Room preview placeholder */}
            <div className="h-32 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4 flex items-center justify-center text-slate-400 dark:text-slate-500">
              No Preview
            </div>
            
            {/* Room details */}
            <h3 className="font-semibold text-slate-800 dark:text-white">
              Final SE Project Brainstorm
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Last edited 2 hours ago
            </p>
            
            {/* Collaborator avatars */}
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white">
                US
              </div>
              <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white">
                UR
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300">
                +2
              </div>
            </div>
          </div>

          {/* Empty state - Create first room */}
          <div 
            className="bg-white dark:bg-slate-800 p-5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 min-h-[200px] hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-400 dark:hover:text-blue-500 transition-all cursor-pointer" 
            onClick={() => setIsModalOpen(true)}
            role="button"
            aria-label="Create your first room"
          >
            <Plus size={40} className="mb-2" aria-hidden="true" />
            <span className="font-medium">Create your first room</span>
          </div>
          
          {/* Additional room cards would be rendered here in production */}
        </div>

        {/* Create Room Modal */}
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Create New Room"
        >
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Room Name
              </label>
              <input 
                type="text" 
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Weekly Brainstorm" 
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
                aria-label="Room name"
              />
            </div>
            
            {/* Privacy toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe size={20} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                ) : (
                  <Lock size={20} className="text-slate-600 dark:text-slate-400" aria-hidden="true" />
                )}
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    {isPublic ? "Public" : "Private"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isPublic ? "Anyone with the link can join" : "Only invited users"}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`w-12 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                aria-label={`Set room to ${isPublic ? 'private' : 'public'}`}
                aria-pressed={isPublic}
              >
                <div 
                  className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${isPublic ? 'left-7' : 'left-1'}`} 
                />
              </button>
            </div>

            <Button type="submit" className="w-full py-3">
              Create and Start Drawing
            </Button>
          </form>
        </Modal>
      </main>
    </div>
  );
};

export default Dashboard;