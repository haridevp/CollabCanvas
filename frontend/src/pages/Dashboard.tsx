import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { 
  Plus, Search, Filter, Lock, Globe, Users, 
  Grid, List, Bookmark, History, TrendingUp, Hash, User
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import RoomCardComponent from '../components/ui/RoomCardComponent';
import RoomCreationModal from '../features/rooms/RoomCreationModal';
import RoomJoinModal from '../features/rooms/RoomJoinModal';
import { useAuth } from '../services/AuthContext';
import type { Room } from '../services/roomService';
import roomService from '../services/roomService';

/**
 * Dashboard Component - Main dashboard with complete room management
 * 
 * This component serves as the central hub for room discovery, creation,
 * and management. It implements features from Epic 3: Room Management.
 * 
 * @component
 * @implements {Epic 3.1} Room discovery and joining
 * @implements {Epic 3.2} Room creation wizard
 * @implements {Epic 3.4} Room list with filtering and sorting
 * @implements {Epic 3.7} User's room management
 * 
 * @returns {JSX.Element} The rendered dashboard component
 * 
 * @example
 * ```tsx
 * // Route configuration
 * <Route path="/dashboard" element={<Dashboard />} />
 * ```
 * 
 * @remarks
 * Key Features:
 * 1. Room creation and joining workflows
 * 2. Personal room management
 * 3. Public room discovery with filtering
 * 4. Room statistics and metrics
 * 5. Responsive grid/list views
 */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Room data states
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'my-rooms' | 'public' | 'recent' | 'bookmarked'>('my-rooms');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'name'>('newest');

  /**
   * Load rooms when component mounts or dependencies change
   * 
   * This effect triggers room loading when:
   * 1. Component first mounts
   * 2. Active tab changes (My Rooms vs Public Rooms)
   * 3. Sort criteria changes
   * 
   * @effect
   */
  useEffect(() => {
    loadRooms();
  }, [activeTab, sortBy]);

  /**
   * Loads rooms from the API based on current filter settings
   * 
   * @async
   * @function loadRooms
   * @returns {Promise<void>}
   * 
   * @remarks
   * Handles two types of room requests:
   * 1. User's rooms (my-rooms tab)
   * 2. Public rooms (public tab) with optional sorting
   * 
   * Error handling logs errors but doesn't crash the UI
   */
  const loadRooms = async () => {
    setIsLoading(true);
    try {
      // Fetch both in parallel on initial mount or when needed
      const [myRoomsResult, publicRoomsResult] = await Promise.all([
        roomService.getMyRooms(),
        roomService.getPublicRooms({ sort: sortBy })
      ]);

      if (myRoomsResult.success && myRoomsResult.rooms) {
        setMyRooms(myRoomsResult.rooms);
      }
      if (publicRoomsResult.success && publicRoomsResult.rooms) {
        setPublicRooms(publicRoomsResult.rooms);
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles successful room creation and refreshes room list
   * 
   * @function handleRoomCreated
   * @param {string} roomId - ID of the newly created room
   */
  const handleRoomCreated = (roomId: string) => {
    navigate(`/room/${roomId}`);
    setShowCreateModal(false);
    loadRooms(); // Refresh the rooms list
  };

  /**
   * Filters rooms based on current search query
   * 
   * @constant {Room[]} filteredRooms
   * Filters rooms by name or description containing search query
   */
  const filteredRooms = (activeTab === 'my-rooms' ? myRooms : publicRooms).filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Dashboard navigation tabs configuration
   * 
   * @constant {Array} tabs
   * @property {string} id - Unique identifier for the tab
   * @property {string} label - Display label for the tab
   * @property {React.ComponentType} icon - Icon component for the tab
   * @property {number} [count] - Optional count badge for the tab
   */
  const tabs = [
    { id: 'my-rooms', label: 'My Rooms', icon: Grid, count: myRooms.length },
    { id: 'public', label: 'Public Rooms', icon: Globe, count: publicRooms.length },
    { id: 'recent', label: 'Recent', icon: History },
    { id: 'bookmarked', label: 'Bookmarked', icon: Bookmark },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar navigation */}
      <Sidebar />
      
      {/* Main content area */}
      <main className="flex-1 p-6 lg:p-8">
        {/* Dashboard header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                Collaborative Canvas Workspace
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Welcome back, <span className="font-semibold text-blue-600 dark:text-blue-400">{user?.fullName || user?.username || 'User'}</span>
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setShowJoinModal(true)}
                aria-label="Join existing room"
              >
                <Hash size={18} />
                <span className="hidden sm:inline">Join Room</span>
              </Button>
              <Button 
                className="gap-2"
                onClick={() => setShowCreateModal(true)}
                aria-label="Create new room"
              >
                <Plus size={20} />
                New Room
              </Button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Active Rooms</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{myRooms.length}</p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Grid className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Collaborators</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {myRooms.reduce((sum, room) => sum + room.participantCount, 0)}
                  </p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Public Rooms</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{publicRooms.length}</p>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Room management controls */}
        <div className="mb-8 space-y-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  aria-label={`Switch to ${tab.label} tab`}
                  aria-pressed={activeTab === tab.id}
                >
                  <Icon size={18} />
                  <span className="font-medium">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id
                        ? 'bg-white/20'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search and filter bar */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" size={20} />
              <input 
                type="text" 
                placeholder={`Search ${activeTab === 'my-rooms' ? 'your' : 'public'} rooms...`} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                aria-label="Search rooms"
              />
            </div>
            
            <div className="flex gap-3">
              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Sort rooms by"
                >
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="name">Name (A-Z)</option>
                </select>
                <Filter className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={20} />
              </div>

              {/* View mode toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <Grid size={20} className={viewMode === 'grid' ? 'text-blue-600' : 'text-slate-400'} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <List size={20} className={viewMode === 'list' ? 'text-blue-600' : 'text-slate-400'} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rooms grid/list */}
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 dark:text-slate-400">Loading rooms...</p>
              </div>
            </div>
          ) : filteredRooms.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredRooms.map((room) => (
                  <RoomCardComponent
                    key={room.id}
                    id={room.id}
                    name={room.name}
                    description={room.description}
                    isPublic={room.isPublic}
                    ownerName={room.ownerName}
                    participantCount={room.participantCount}
                    maxParticipants={room.maxParticipants}
                    createdAt={room.createdAt}
                    updatedAt={room.updatedAt}
                    showJoinButton={activeTab !== 'my-rooms'}
                    showOwnerInfo={activeTab === 'public'}
                    onClick={() => navigate(`/room/${room.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRooms.map((room) => (
                  <div 
                    key={room.id}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/room/${room.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && navigate(`/room/${room.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {room.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">{room.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              {room.ownerName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              {room.participantCount} participants
                            </span>
                            <span className="flex items-center gap-1">
                              {room.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                              {room.isPublic ? 'Public' : 'Private'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Updated {new Date(room.updatedAt).toLocaleDateString()}
                        </div>
                        <Button variant="outline" className="mt-2">
                          {activeTab === 'my-rooms' ? 'Open' : 'Join'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'my-rooms' ? (
                  <Plus className="w-10 h-10 text-slate-400" />
                ) : (
                  <Globe className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {searchQuery ? 'No rooms found' : 
                  activeTab === 'my-rooms' ? 'No rooms yet' : 'No public rooms available'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : activeTab === 'my-rooms'
                    ? 'Create your first room to start collaborating'
                    : 'Be the first to create a public room!'}
              </p>
              {activeTab === 'my-rooms' && !searchQuery && (
                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                  <Plus size={20} />
                  Create Your First Room
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Featured/trending section for public rooms */}
        {activeTab === 'public' && publicRooms.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Trending Rooms</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicRooms
                .filter(room => room.participantCount > 5)
                .slice(0, 3)
                .map((room) => (
                  <div key={room.id} className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Trending</span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">{room.name}</h3>
                    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>{room.participantCount} active users</span>
                      <Button onClick={() => navigate(`/room/${room.id}`)}>
                        Join Now
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <RoomCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoomCreated={handleRoomCreated}
      />

      <RoomJoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </div>
  );
};

export default Dashboard;