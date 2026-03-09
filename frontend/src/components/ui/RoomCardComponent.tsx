import React from 'react';
import { Users, Lock, Globe, Calendar, Clock, ArrowRight, User } from 'lucide-react';
import { Button } from './Button';
import { Link } from 'react-router-dom';
import { RoomPreviewCanvas } from './RoomPreviewCanvas';

/**
 * Interface defining the properties for the RoomCard component
 * 
 * @interface RoomCardProps
 * @property {string} id - Unique identifier for the room
 * @property {string} name - Display name of the room
 * @property {string} [description] - Optional description of the room
 * @property {boolean} isPublic - Whether the room is publicly accessible
 * @property {string} ownerName - Name of the room owner/creator
 * @property {number} participantCount - Current number of participants in the room
 * @property {number} maxParticipants - Maximum allowed participants in the room
 * @property {string} createdAt - ISO timestamp when the room was created
 * @property {string} updatedAt - ISO timestamp when the room was last updated
 * @property {string} [thumbnail] - Optional thumbnail URL for the room
 * @property {any[]} [drawingData] - Optional raw drawing data of the room
 * @property {boolean} [showJoinButton=true] - Whether to show a prominent join button
 * @property {boolean} [showOwnerInfo=true] - Whether to display owner information
 * @property {() => void} [onClick] - Optional click handler for the entire card
 */
export interface RoomCardProps {
  /** Unique identifier for the room */
  id: string;
  /** Display name of the room */
  name: string;
  /** Optional description of the room */
  description?: string;
  /** Whether the room is publicly accessible */
  isPublic: boolean;
  /** Name of the room owner/creator */
  ownerName: string;
  /** Current number of participants in the room */
  participantCount: number;
  /** Maximum allowed participants in the room */
  maxParticipants: number;
  /** ISO timestamp when the room was created */
  createdAt: string;
  /** ISO timestamp when the room was last updated */
  updatedAt: string;
  /** Optional thumbnail URL for the room */
  thumbnail?: string;
  /** Optional raw drawing data of the room */
  drawingData?: any[];
  /** Whether to show a prominent join button */
  showJoinButton?: boolean;
  /** Whether to display owner information */
  showOwnerInfo?: boolean;
  /** Optional click handler for the entire card */
  onClick?: () => void;
}

/**
 * RoomCard Component
 * 
 * @component
 * @description
 * A card component that displays information about a collaboration room.
 * Shows room details, participant count, privacy status, and provides
 * quick access to join or view the room.
 * 
 * @features
 * - **Visual Design**: Gradient header with room status indicators
 * - **Privacy Indicators**: Clear visual distinction between public and private rooms
 * - **Participant Count**: Shows current/max participants with visual indicator
 * - **Time Information**: Created/updated timestamps with relative time formatting
 * - **Interactive Elements**: Clickable card with hover effects
 * - **Responsive Layout**: Adapts to different screen sizes
 * - **Multiple Actions**: Join button or simple open link based on context
 * 
 * @example
 * ```tsx
 * // Basic room card
 * <RoomCard
 *   id="room-123"
 *   name="Design Collaboration"
 *   description="Working on new website design"
 *   isPublic={true}
 *   ownerName="Alex Johnson"
 *   participantCount={5}
 *   maxParticipants={20}
 *   createdAt="2024-01-15T10:30:00Z"
 *   updatedAt="2024-01-15T14:45:00Z"
 * />
 * 
 * // Private room without join button
 * <RoomCard
 *   id="private-room-456"
 *   name="Team Planning"
 *   isPublic={false}
 *   ownerName="Sarah Chen"
 *   participantCount={3}
 *   maxParticipants={10}
 *   createdAt="2024-01-14T09:00:00Z"
 *   updatedAt="2024-01-15T16:20:00Z"
 *   showJoinButton={false}
 *   showOwnerInfo={false}
 * />
 * ```
 * 
 * @param {RoomCardProps} props - Component properties
 * @param {string} props.id - Room identifier
 * @param {string} props.name - Room name
 * @param {string} [props.description] - Room description
 * @param {boolean} props.isPublic - Public access flag
 * @param {string} props.ownerName - Room owner name
 * @param {number} props.participantCount - Current participant count
 * @param {number} props.maxParticipants - Maximum participant limit
 * @param {string} props.createdAt - Creation timestamp
 * @param {string} props.updatedAt - Last update timestamp
 * @param {string} [props.thumbnail] - Room thumbnail URL
 * @param {any[]} [props.drawingData] - Raw drawing data
 * @param {boolean} [props.showJoinButton=true] - Show join button
 * @param {boolean} [props.showOwnerInfo=true] - Show owner info
 * @param {() => void} [props.onClick] - Card click handler
 * 
 * @returns {JSX.Element} Room card UI component
 */
const RoomCardComponent: React.FC<RoomCardProps> = ({
  id,
  name,
  description,
  isPublic,
  ownerName,
  participantCount,
  maxParticipants,
  createdAt,
  updatedAt,
  thumbnail,
  drawingData,
  showJoinButton = true,
  showOwnerInfo = true,
  onClick
}) => {
  /**
   * Format a date string into a readable date format
   * 
   * @function formatDate
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date (e.g., "Jan 15, 2024")
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  /**
   * Format a date string into a relative time string
   * Shows minutes/hours/days ago for recent dates, otherwise shows date
   * 
   * @function formatTimeAgo
   * @param {string} dateString - ISO date string
   * @returns {string} Relative time string (e.g., "2h ago", "3d ago", "Jan 15")
   */
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return formatDate(dateString);
    }
  };



  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:translate-y-[-2px] cursor-pointer"
      onClick={onClick}
      role="article"
      aria-label={`Room: ${name}`}
    >
      {/* Room thumbnail/header section with gradient background */}
      <div
        className="h-40 relative"
        style={{
          background: (!drawingData && thumbnail)
            ? `url(${thumbnail}) center/cover no-repeat`
            : (!drawingData && 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)') || 'transparent'
        }}
      >
        {drawingData && (
          <div className="absolute inset-0 z-0 opacity-90 rounded-t-xl overflow-hidden">
            <RoomPreviewCanvas drawingData={drawingData} />
            {/* Add a subtle dark gradient overlay so badges stay readable */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
          </div>
        )}

        {/* Privacy status badge */}
        {!isPublic && (
          <div
            className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs backdrop-blur-sm"
            role="status"
            aria-label="Private room"
          >
            <Lock size={12} aria-hidden="true" />
            <span>Private</span>
          </div>
        )}

        {/* Participant count indicator */}
        <div
          className="absolute bottom-3 right-3 bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 rounded-lg backdrop-blur-sm"
          role="status"
          aria-label={`${participantCount} of ${maxParticipants} participants`}
        >
          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-white">
            <Users size={16} aria-hidden="true" />
            <span>{participantCount}/{maxParticipants}</span>
          </div>
        </div>
      </div>

      {/* Room content section */}
      <div className="p-4">
        {/* Room name and privacy icon */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate flex-1 mr-2">
            {name}
          </h3>
          <div className="flex items-center gap-1" role="img" aria-label={isPublic ? "Public room" : "Private room"}>
            {isPublic ? (
              <span title="Public Room" aria-label="Public room">
                <Globe className="w-4 h-4 text-green-500" aria-hidden="true" />
              </span>
            ) : (
              <span title="Private Room" aria-label="Private room">
                <Lock className="w-4 h-4 text-amber-500" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>

        {/* Room description (truncated to 2 lines) */}
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2" aria-label="Room description">
            {description}
          </p>
        )}

        {/* Room metadata section */}
        <div className="space-y-2 mb-4">
          {/* Owner information */}
          {showOwnerInfo && (
            <div
              className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
              aria-label={`Created by ${ownerName}`}
            >
              <User size={14} aria-hidden="true" />
              <span className="truncate">Created by {ownerName}</span>
            </div>
          )}

          {/* Date information */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div
              className="flex items-center gap-1"
              aria-label={`Created on ${formatDate(createdAt)}`}
            >
              <Calendar size={12} aria-hidden="true" />
              <span>Created {formatDate(createdAt)}</span>
            </div>
            <div
              className="flex items-center gap-1"
              aria-label={`Updated ${formatTimeAgo(updatedAt)}`}
            >
              <Clock size={12} aria-hidden="true" />
              <span>Updated {formatTimeAgo(updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons section */}
        <div className="flex gap-2">
          {showJoinButton ? (
            // Prominent "Enter Room" button for main room listings
            <Link
              to={`/room/${id}`}
              className="flex-1"
              aria-label={`Enter room: ${name}`}
              onClick={(e) => {
                // Prevent card onClick from firing when clicking the link
                if (onClick) e.stopPropagation();
              }}
            >
              <Button className="w-full gap-2">
                <ArrowRight size={16} aria-hidden="true" />
                Enter Room
              </Button>
            </Link>
          ) : (
            // Simple "Open" button for secondary contexts
            <Link
              to={`/room/${id}`}
              className="flex-1"
              aria-label={`Open room: ${name}`}
              onClick={(e) => {
                if (onClick) e.stopPropagation();
              }}
            >
              <Button variant="outline" className="w-full">
                Open
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

// Export both named and default exports for flexibility
export { RoomCardComponent as RoomCard };
export default RoomCardComponent;