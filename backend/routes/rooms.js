/**
 * @fileoverview Routes for room creation, joining, management, and collaborative features.
 */

// Import express to define API endpoints
const express = require("express");
// Destructure and import all handler functions from the room controller
const {
  createRoom,
  joinRoom,
  getPublicRooms,
  getMyRooms,
  updateRoom,
  deleteRoom,
  leaveRoom,
  manageParticipant,
  validateRoom,
  inviteUsers,
  exportDrawing,
  getParticipants,
} = require("../controllers/roomController");
// Import canvas-specific controller functions
const {
  saveCanvas,
  getCanvasVersions,
  restoreCanvasVersion,
  getCanvasState,
} = require('../controllers/canvasController');
// Import the authentication middleware to secure room-specific routes
const auth = require("../middleware/authh");
// Import the asyncHandler utility to handle internal errors gracefully
const { asyncHandler } = require("../middleware/errorHandler");

// Initialize the express router instance
const router = express.Router();

/**
 * @route   POST /api/rooms/create
 * @desc    Create a new collaborative drawing room.
 * @access  Private
 */
// Endpoint to initiate a new room session
router.post("/create", auth, asyncHandler(createRoom));

/**
 * @route   POST /api/rooms/join
 * @desc    Join an existing room using a code or password.
 * @access  Private
 */
// Endpoint for users to enter a room by its identification code
router.post("/join", auth, asyncHandler(joinRoom));

/**
 * @route   GET /api/rooms/public
 * @desc    Get a list of all public drawing rooms.
 * @access  Public
 */
// Endpoint to browse available public rooms
router.get("/public", asyncHandler(getPublicRooms));

/**
 * @route   GET /api/rooms/my-rooms
 * @desc    Get all rooms created or joined by the current user.
 * @access  Private
 */
// Endpoint to fetch the user's personal dashboard of rooms
router.get("/my-rooms", auth, asyncHandler(getMyRooms));

/**
 * @route   GET /api/rooms/:id/validate
 * @desc    Validate if a room exists and the user has access.
 * @access  Private
 */
// Endpoint to check access permissions before opening the canvas
router.get("/:id/validate", auth, asyncHandler(validateRoom));

/**
 * @route   GET /api/rooms/:id/participants
 * @desc    Get the list of participants in a room.
 * @access  Private
 */
// Endpoint to fetch participants for a specific room
router.get("/:id/participants", auth, asyncHandler(getParticipants));

/**
 * @route   GET /api/rooms/:id/export
 * @desc    Export the current drawing in a room.
 * @access  Private
 */
// Endpoint to generate a static image or data dump of the current canvas
router.get("/:id/export", auth, asyncHandler(exportDrawing));

/**
 * @route   POST /api/rooms/:id/canvas/save
 * @desc    Persist the full drawing element array for a room (auto-save / manual save / emergency beacon).
 * @access  Private (members); also accepts sendBeacon with no Auth header
 */
router.post(
  '/:id/canvas/save',
  // Attempt auth but fall through gracefully for unauthenticated beacon saves
  (req, res, next) => {
    if (req.headers.authorization) {
      return auth(req, res, next);
    }
    // No auth header — allow the request through (emergency beacon save)
    next();
  },
  asyncHandler(saveCanvas)
);

/**
 * @route   GET /api/rooms/:id/canvas/versions
 * @desc    List canvas snapshot versions for a room (newest first).
 * @access  Private
 */
router.get('/:id/canvas/versions', auth, asyncHandler(getCanvasVersions));

/**
 * @route   POST /api/rooms/:id/canvas/restore/:versionId
 * @desc    Restore the room canvas to a historical snapshot (owner / moderator only).
 * @access  Private
 */
router.post('/:id/canvas/restore/:versionId', auth, asyncHandler(restoreCanvasVersion));

/**
 * @route   POST /api/rooms/:id/leave
 * @desc    Leave a collaborative room.
 * @access  Private
 */
// Endpoint to formally disconnect a user from a room's participant list
router.post("/:id/leave", auth, asyncHandler(leaveRoom));

/**
 * @route   POST /api/rooms/:id/invite
 * @desc    Invite users to join a private room.
 * @access  Private
 */
// Endpoint to send invitation links or notifications to other users
router.post("/:id/invite", auth, asyncHandler(inviteUsers));

/**
 * @route   POST /api/rooms/:id/participants/:userId
 * @desc    Manage participants within a room (kick, promote, etc.).
 * @access  Private
 */
// Endpoint for administrators to moderate users in the session
router.post("/:id/participants/:userId", auth, asyncHandler(manageParticipant));

/**
 * @route   GET /api/rooms/:id/canvas/state
 * @desc    Get the current full canvas drawing state (HTTP fallback for reconnection sync).
 * @access  Private
 */
router.get('/:id/canvas/state', auth, asyncHandler(getCanvasState));

/**
 * @route   PUT /api/rooms/:id
 * @desc    Update room details (name, description, visibility).
 * @access  Private (Owner only)
 */
// Endpoint to modify room settings or metadata
router.put("/:id", auth, asyncHandler(updateRoom));

/**
 * @route   DELETE /api/rooms/:id
 * @desc    Delete a drawing room.
 * @access  Private (Owner only)
 */
// Endpoint to permanently close and remove a room session
router.delete("/:id", auth, asyncHandler(deleteRoom));


// Export the router to be used by the main express application
module.exports = router;


