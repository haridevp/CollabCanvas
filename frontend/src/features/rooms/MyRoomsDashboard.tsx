import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid, List, Search, Filter, Clock, Star, Bookmark,
  Users, Lock, Globe, Calendar, Trash2, Archive, Eye, EyeOff,
  RefreshCw, MoreVertical, ChevronRight, Loader2, FolderOpen
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import RoomCardComponent from '../../components/ui/RoomCardComponent';
import type { Room } from '../../services/roomService';
import roomService from '../../services/roomService';
import { useNavigate } from 'react-router-dom';

/**
 * Props for the MyRoomsDashboard component
 * @interface MyRoomsDashboardProps
 */
interface MyRoomsDashboardProps {
  /** Controls whether the dashboard modal is visible */
  isOpen: boolean;
  /** Callback function triggered when dashboard is closed */
  onClose: () => void;
  /** Callback function triggered when a room is selected */
  onRoomSelect: (roomId: string) => void;
}

/**
 * Type definition for sort options
 * @typedef {'recent' | 'name' | 'participants'} SortOption
 */
type SortOption = 'recent' | 'name' | 'participants';

/**
 * Type definition for filter options
 * @typedef {'all' | 'owner' | 'member'} FilterOption
 */
type FilterOption = 'all' | 'owner' | 'member';

/**
 * Type definition for view mode options
 * @typedef {'grid' | 'list'} ViewMode
 */
type ViewMode = 'grid' | 'list';

/**
 * Type definition for room status information
 * @interface RoomStatus
 */
interface RoomStatus {
  /** Human-readable label for the status */
  label: string;
  /** CSS color class for styling */
  color: string;
}

/**
 * Type definition for room action types
 * @typedef {'open' | 'leave' | 'bookmark' | 'archive'} RoomAction
 */
type RoomAction = 'open' | 'leave' | 'bookmark' | 'archive';

/**
 * Dashboard component for managing and viewing user's rooms
 * 
 * @component
 * @example
 * ```tsx
 * <MyRoomsDashboard
 *   isOpen={true}
 *   onClose={() => setIsOpen(false)}
 *   onRoomSelect={(roomId) => navigate(`/room/${roomId}`)}
 * />
 * ```
 */
const MyRoomsDashboard: React.FC<MyRoomsDashboardProps> = ({
  isOpen,
  onClose,
  onRoomSelect
}) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterType, setFilterType] = useState<FilterOption>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showRoomActions, setShowRoomActions] = useState<string | null>(null);

  /**
   * Load rooms when the dashboard opens
   */
  useEffect(() => {
    if (isOpen) {
      loadRooms();
    }
  }, [isOpen]);

  /**
   * Apply filters and sorting whenever dependencies change
   */
  useEffect(() => {
    filterAndSortRooms();
  }, [rooms, searchQuery, sortBy, filterType, showArchived]);

  /**
   * Filters and sorts rooms based on current state
   * 
   * @private
   * @function filterAndSortRooms
   */
  const filterAndSortRooms = useCallback(() => {
    let filtered = [...rooms];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(query) ||
        room.description?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType === 'owner') {
      // TODO: Replace with actual user ID from auth context
      filtered = filtered.filter(room => room.ownerId === 'current-user-id');
    } else if (filterType === 'member') {
      // TODO: Replace with actual user ID from auth context
      filtered = filtered.filter(room => room.ownerId !== 'current-user-id');
    }

    // Apply archived filter
    if (!showArchived) {
      // TODO: Add archived property to Room interface if needed
      // filtered = filtered.filter(room => !room.isArchived);
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'participants':
          return b.participantCount - a.participantCount;
        default:
          return 0;
      }
    });

    setFilteredRooms(filtered);
  }, [rooms, searchQuery, sortBy, filterType, showArchived]);

  /**
   * Loads rooms from the room service
   * 
   * @async
   * @function loadRooms
   * @param {boolean} [refresh=false] - Whether this is a refresh operation
   * @returns {Promise<void>}
   */
  const loadRooms = async (refresh = false): Promise<void> => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await roomService.getMyRooms();
      if (result.success && result.rooms) {
        setRooms(result.rooms);
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
      // TODO: Add error state and user notification
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Handles actions performed on rooms
   * 
   * @async
   * @function handleRoomAction
   * @param {RoomAction} action - The action to perform
   * @param {Room} room - The room to perform the action on
   * @returns {Promise<void>}
   */
  const handleRoomAction = async (action: RoomAction, room: Room): Promise<void> => {
    switch (action) {
      case 'open':
        onRoomSelect(room.id);
        onClose();
        break;
      case 'leave':
        if (window.confirm(`Are you sure you want to leave "${room.name}"?`)) {
          try {
            await roomService.leaveRoom(room.id);
            setRooms(prev => prev.filter(r => r.id !== room.id));
          } catch (error) {
            console.error('Failed to leave room:', error);
            // TODO: Add error notification
          }
        }
        break;
      case 'bookmark':
        // TODO: Implement bookmark functionality
        console.log('Toggle bookmark for:', room.id);
        break;
      case 'archive':
        // TODO: Implement archive functionality
        console.log('Archive room:', room.id);
        break;
    }
    setShowRoomActions(null);
  };

  /**
   * Refreshes the rooms list
   * 
   * @function handleRefresh
   */
  const handleRefresh = () => {
    loadRooms(true);
  };

  /**
   * Determines the status of a room based on its last activity
   * 
   * @function getRoomStatus
   * @param {Room} room - The room to check
   * @returns {RoomStatus} Status information including label and color
   */
  const getRoomStatus = (room: Room): RoomStatus => {
    const lastActive = new Date(room.updatedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 1) return { label: 'Active now', color: 'text-green-500' };
    if (hoursDiff < 24) return { label: 'Today', color: 'text-blue-500' };
    if (hoursDiff < 168) return { label: 'This week', color: 'text-amber-500' };
    return { label: 'Older', color: 'text-slate-400' };
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 dark:bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                My Rooms Dashboard
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Access and manage all your collaborative rooms
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Refresh rooms"
            >
              <RefreshCw className={`w-5 h-5 text-slate-500 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close dashboard"
            >
              <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
          {/* Stats and Filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-semibold text-slate-800 dark:text-white">{rooms.length}</span>
                <span className="text-slate-500 dark:text-slate-400 ml-1">rooms total</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  aria-label="Show all rooms"
                >
                  All Rooms
                </button>
                <button
                  onClick={() => setFilterType('owner')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                    filterType === 'owner'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  aria-label="Show rooms I own"
                >
                  <Star size={14} /> My Rooms
                </button>
                <button
                  onClick={() => setFilterType('member')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                    filterType === 'member'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  aria-label="Show rooms I've joined"
                >
                  <Users size={14} /> Joined Rooms
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  aria-label="Show archived rooms"
                />
                Show Archived
              </label>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" size={20} aria-hidden="true" />
              <input
                type="text"
                placeholder="Search your rooms by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search rooms"
              />
            </div>

            <div className="flex gap-3">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Sort rooms by"
                >
                  <option value="recent">Recently Active</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="participants">Most Participants</option>
                </select>
                <Filter className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={20} aria-hidden="true" />
              </div>

              {/* View Mode Toggle */}
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

        {/* Rooms Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-260px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" aria-hidden="true" />
                <p className="text-slate-500 dark:text-slate-400">Loading your rooms...</p>
              </div>
            </div>
          ) : filteredRooms.length > 0 ? (
            <>
              {/* Rooms Grid/List */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRooms.map((room) => {
                    const status = getRoomStatus(room);
                    return (
                      <div key={room.id} className="relative group">
                        <RoomCardComponent
                          id={room.id}
                          name={room.name}
                          description={room.description}
                          isPublic={room.isPublic}
                          ownerName={room.ownerName}
                          participantCount={room.participantCount}
                          maxParticipants={room.maxParticipants}
                          createdAt={room.createdAt}
                          updatedAt={room.updatedAt}
                          showJoinButton={false}
                          showOwnerInfo={filterType === 'all' || filterType === 'member'}
                          onClick={() => onRoomSelect(room.id)}
                        />
                        
                        {/* Room Status Badge */}
                        <div className={`absolute top-3 left-3 px-2 py-1 text-xs rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm ${status.color}`}>
                          {status.label}
                        </div>

                        {/* Quick Actions */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRoom(room);
                                setShowRoomActions(room.id);
                              }}
                              className="p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg hover:bg-white dark:hover:bg-slate-800"
                              aria-label={`Actions for ${room.name}`}
                            >
                              <MoreVertical className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRooms.map((room) => {
                    const status = getRoomStatus(room);
                    return (
                      <div
                        key={room.id}
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                        onClick={() => onRoomSelect(room.id)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => e.key === 'Enter' && onRoomSelect(room.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                {room.name.charAt(0)}
                              </div>
                              <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 text-xs rounded-full bg-white dark:bg-slate-900 border ${status.color}`}>
                                {status.label}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-slate-900 dark:text-white">{room.name}</h3>
                                {room.isPublic ? (
                                  <Globe className="w-4 h-4 text-green-500" aria-label="Public room" />
                                ) : (
                                  <Lock className="w-4 h-4 text-amber-500" aria-label="Private room" />
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Users size={14} />
                                  {room.participantCount} participants
                                </span>
                                <span aria-hidden="true">•</span>
                                <span>By {room.ownerName}</span>
                                <span aria-hidden="true">•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  Updated {new Date(room.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {room.participantCount}/{room.maxParticipants}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                participants
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRoom(room);
                                setShowRoomActions(room.id);
                              }}
                              className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                              aria-label={`Actions for ${room.name}`}
                            >
                              <MoreVertical className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty State for filtered results */}
              {filteredRooms.length === 0 && searchQuery && (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No rooms found matching "{searchQuery}"
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No Rooms Yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                {filterType === 'owner'
                  ? "You haven't created any rooms yet. Start by creating your first room!"
                  : "You haven't joined any rooms yet. Join a public room or ask for an invite!"}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/dashboard')} variant="outline">
                  Browse Public Rooms
                </Button>
                <Button onClick={() => navigate('/dashboard')}>
                  Create New Room
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {rooms.length > 0 ? (
                <>
                  Showing {filteredRooms.length} of {rooms.length} rooms •{' '}
                  {rooms.filter(r => r.participantCount > 0).length} currently active
                </>
              ) : (
                'Create or join rooms to start collaborating'
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Room Actions Menu */}
        {selectedRoom && showRoomActions && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                  {selectedRoom.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  {selectedRoom.isPublic ? 'Public Room' : 'Private Room'} • {selectedRoom.participantCount} participants
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => handleRoomAction('open', selectedRoom)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    aria-label={`Open ${selectedRoom.name}`}
                  >
                    <Eye className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Open Room</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Enter the room workspace</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleRoomAction('bookmark', selectedRoom)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    aria-label={`Bookmark ${selectedRoom.name}`}
                  >
                    <Bookmark className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Bookmark Room</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Add to favorites for quick access</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleRoomAction('archive', selectedRoom)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    aria-label={`Archive ${selectedRoom.name}`}
                  >
                    <Archive className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Archive Room</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Move to archived rooms</p>
                    </div>
                  </button>

                  {selectedRoom.ownerId !== 'current-user-id' && (
                    <button
                      onClick={() => handleRoomAction('leave', selectedRoom)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
                      aria-label={`Leave ${selectedRoom.name}`}
                    >
                      <Trash2 className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Leave Room</p>
                        <p className="text-xs">Remove yourself from this room</p>
                      </div>
                    </button>
                  )}
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    onClick={() => setShowRoomActions(null)}
                    className="flex-1"
                    variant="outline"
                    aria-label="Cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      onRoomSelect(selectedRoom.id);
                      onClose();
                    }}
                    className="flex-1"
                    aria-label={`Open ${selectedRoom.name}`}
                  >
                    Open
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRoomsDashboard;