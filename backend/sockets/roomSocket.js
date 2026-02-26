/**
 * @fileoverview Socket.io handler for real-time room collaboration, drawing, and moderation.
 */

// Import mongoose for ObjectId validation
const mongoose = require("mongoose");
// Import the Room model to access drawing data and metadata
const Room = require("../models/Room");
// Import the Participant model to manage user-room membership and roles
const Participant = require("../models/Participant");
// Import the CanvasVersion model for save-canvas snapshot creation
const CanvasVersion = require('../models/CanvasVersion');

// In-memory store for active object locks: { roomId: { objectId: { userId, socketId, timestamp } } }
const roomLocks = new Map();
// Define how long a lock stays active before being considered stale (30 seconds)
const LOCK_TIMEOUT = 30000; 

// Memory buffer for drawing updates to batch multiple strokes into fewer DB writes: { roomId: [drawingElements] }
const drawingBuffer = new Map();
// Interval for flushing the drawing buffer to the MongoDB database (5 seconds)
const FLUSH_INTERVAL = 5000; 

/**
 * Main handler for room-related socket events.
 * 
 * @function roomSocketHandler
 * @param {import('socket.io').Server} io - Socket.io server instance.
 * @param {import('socket.io').Socket} socket - Socket instance for a specific client.
 */
const roomSocketHandler = (io, socket) => {
  /**
   * Cleans up all locks held by a specific socket upon disconnection or leaving.
   * @param {string} socketId - Unique ID of the socket connection.
   */
  const cleanupUserLocks = (socketId) => {
    // Iterate through all rooms stored in the lock map
    roomLocks.forEach((locks, roomId) => {
      // Iterate through all individual object locks in the current room
      Object.keys(locks).forEach((objectId) => {
        // Find locks that belong to the specified socket ID
        if (locks[objectId].socketId === socketId) {
          // Remove the lock from memory
          delete locks[objectId];
          // Notify other users in the room that the object is now free
          io.to(roomId).emit("object-unlocked", { objectId });
        }
      });
    });
  };

  /**
   * Fetches the current list of participants for a room, including their user details.
   * @async
   * @param {string} roomId - Unique ID of the target room.
   * @returns {Promise<Array<Object>>} List of sanitized participant objects.
   */
  const getParticipantsList = async (roomId) => {
    try {
      // Find all active connection records for the room that aren't currently banned
      const participants = await Participant.find({
        room: roomId,
        isBanned: false,
      })
      // Populate foreign keys with specific display-oriented user fields
      .populate("user", "username email avatar");

      // Map DB documents into a clean array format for the frontend
      return participants.map((p) => ({
        id: p._id,
        userId: p.user._id,
        username: p.user.username,
        email: p.user.email,
        avatar: p.user.avatar,
        role: p.role,
        joinedAt: p.joinedAt,
        lastActive: p.lastSeen,
      }));
    } catch (error) {
      // Log errors if retrieval or population fails
      console.error("Error getting participants list:", error);
      // Return an empty array as a fallback
      return [];
    }
  };

  // Setup a background interval to periodically persist buffered drawing data to the database
  const flushBufferInterval = setInterval(async () => {
    // Iterate through all room entries in the drawing data buffer
    for (const [roomId, elements] of drawingBuffer.entries()) {
      // Only proceed if there is data waiting to be saved for this room
      if (elements.length > 0) {
        try {
          // De-duplicate elements in the buffer based on their unique ID before saving
          const uniqueElements = [
            ...new Map(elements.map((item) => [item.id, item])).values(),
          ];

          // Bulk append the new elements to the room's drawingData array in MongoDB
          await Room.findByIdAndUpdate(roomId, {
            $push: { drawingData: { $each: uniqueElements } },
          });
          // Reset the buffer for this room to an empty state
          drawingBuffer.set(roomId, []);
        } catch (err) {
          // Log errors if the batch write operation fails
          console.error(`Failed to flush buffer for room ${roomId}:`, err);
        }
      }
    }
  }, FLUSH_INTERVAL);

  /**
   * Event: join-room
   * Triggered when a user initiates a connection to a collaborative room session.
   */
  socket.on("join-room", async ({ roomId, userId }) => {
    try {
      // Resolve the incoming roomId (could be a roomCode or MongoDB ObjectId) to the actual _id
      let resolvedRoomId = roomId;
      let room;
      if (mongoose.Types.ObjectId.isValid(roomId)) {
        // Try by _id first, fall back to roomCode
        room = await Room.findOne({
          $or: [{ _id: roomId }, { roomCode: roomId }],
          isActive: true,
        });
      } else {
        // Not an ObjectId, must be a roomCode
        room = await Room.findOne({ roomCode: roomId, isActive: true });
      }

      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }
      // Use the canonical MongoDB _id for all subsequent operations
      resolvedRoomId = room._id.toString();

      // Retrieve the participant's permission and status record
      const participant = await Participant.findOne({
        user: userId,
        room: resolvedRoomId,
      }).populate("user", "username");

      // Security check: if the user record exists and is flagged as banned, prevent entry
      if (participant && participant.isBanned) {
        // Emit an error event back to the single user
        socket.emit("error", { message: "You have been banned from this room" });
        return;
      }

      // Add the socket connection to the specified room IDs messaging channel
      socket.join(resolvedRoomId);
      // Store session context directly on the socket object for disposal cleanup
      socket.data = { userId, roomId: resolvedRoomId };

      // If a participant record was found, let others in the room know who joined
      if (participant) {
        // Broadcast 'user-joined' event to everyone in the room except the new joiner
        socket.to(resolvedRoomId).emit("user-joined", {
          user: participant.user.username,
          userId: userId,
          role: participant.role,
        });
      }

      // Immediately fetch and broadcast the refreshed participant roster for this room
      const participantsList = await getParticipantsList(resolvedRoomId);
      io.to(resolvedRoomId).emit("participants-updated", {
        participants: participantsList,
      });

      // Merge elements from the DB with any "volatile" data still in the flush buffer
      const bufferedData = drawingBuffer.get(resolvedRoomId) || [];
      const currentDrawingData = [...(room.drawingData || []), ...bufferedData];

      // Retrieve any active object locks currently held for this room in memory
      const currentLocks = roomLocks.get(resolvedRoomId) || {};

      // Send the complete room state to the newly joined client for initial synchronization
      // Include the resolvedRoomId so the frontend uses the canonical _id for all socket events
      socket.emit("room-state", {
        room,
        drawingData: currentDrawingData,
        activeLocks: currentLocks,
        resolvedRoomId: resolvedRoomId,
      });
    } catch (error) {
      // Handle server/connection errors during initialization
      console.error(error);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  /**
   * Event: leave-room
   * Triggered when a user explicitly leaves a drawing session (e.g., clicking 'Leave Room').
   */
  socket.on("leave-room", async ({ roomId, userId }) => {
    // Remove the socket from the messaging channel
    socket.leave(roomId);
    // Release any object locks the user had held
    cleanupUserLocks(socket.id);
    // Notify others in the room that this user has left
    socket.to(roomId).emit("user-left", { userId });

    // Re-fetch and broadcast the updated participant list to reflect the departure
    const participantsList = await getParticipantsList(roomId);
    io.to(roomId).emit("participants-updated", {
      participants: participantsList,
    });
  });

  /**
   * Event: ping
   * Connection health monitoring.
   */
  socket.on("ping", (cb) => {
    if (typeof cb === "function") cb();
  });

  /**
   * Event: cursor-move
   * Broadcasts user cursor position for real-time presence/ghost cursors.
   * Forwards tool and color metadata so clients can render the correct tool icon.
   */
  socket.on("cursor-move", ({ roomId, x, y, userId, username, tool, color }) => {
    // Send volatile updates (dropped if network is slow) to others in the room
    socket.volatile.to(roomId).emit("cursor-update", { userId, x, y, username, tool, color });
  });

  /**
   * Event: drawing-update
   * Broadcasts drawing strokes/elements and stores them in the memory buffer for later persistence.
   */
  socket.on("drawing-update", (data) => {
    // Broadcast the update immediately to all other participants for low-latency visual feedback
    socket.to(data.roomId).emit("drawing-update", data);

    // If the data payload contains a full element and is flagged for persistence
    if (data.element && data.saveToDb) {
      // Ensure the buffer exists for this specific room
      if (!drawingBuffer.has(data.roomId)) {
        drawingBuffer.set(data.roomId, []);
      }
      // Add the element to the room's draw buffer for the next periodic flush
      drawingBuffer.get(data.roomId).push(data.element);
    }
  });

  /**
   * Event: request-lock
   * Requests an exclusive lock on a drawing element to prevent concurrent edits.
   */
  socket.on("request-lock", ({ roomId, objectId, userId }) => {
    // Initialize the lock tracking object for the room if it doesn't exist
    if (!roomLocks.has(roomId)) {
      roomLocks.set(roomId, {});
    }

    const roomLocksMap = roomLocks.get(roomId);
    const currentLock = roomLocksMap[objectId];
    const now = Date.now();

    // Check if the object is already locked by someone else and the lock hasn't timed out
    if (
      currentLock &&
      currentLock.userId !== userId &&
      now - currentLock.timestamp < LOCK_TIMEOUT
    ) {
      // If locked, inform the requester that access is denied
      socket.emit("lock-denied", { objectId, lockedBy: currentLock.userId });
      return;
    }

    // Assign the lock to the requesting user/socket with a timestamp
    roomLocksMap[objectId] = { userId, socketId: socket.id, timestamp: now };
    // Broadcast the lock acquisition to everyone in the room
    io.to(roomId).emit("object-locked", { objectId, userId });
  });

  /**
   * Event: release-lock
   * Explicitly releases an exclusive lock on a drawing element.
   */
  socket.on("release-lock", ({ roomId, objectId, userId }) => {
    const roomLocksMap = roomLocks.get(roomId);
    // Verify that a lock exists and that it belongs to the user requesting the release
    if (
      roomLocksMap &&
      roomLocksMap[objectId] &&
      roomLocksMap[objectId].userId === userId
    ) {
      // Remove the lock from memory
      delete roomLocksMap[objectId];
      // Notify all participants that the object is now available for editing
      io.to(roomId).emit("object-unlocked", { objectId });
    }
  });

  /**
   * Event: lock-object
   * Active alternative event for locking (triggered when starting a new shape/stroke).
   */
  socket.on("lock-object", ({ roomId, elementId, userId, username, color }) => {
    // Ensure room tracking exists
    if (!roomLocks.has(roomId)) {
      roomLocks.set(roomId, {});
    }

    const roomLocksMap = roomLocks.get(roomId);
    // Record the metadata associated with this active edit lock
    roomLocksMap[elementId] = {
      userId,
      socketId: socket.id,
      username,
      color,
      timestamp: Date.now(),
    };

    // Broadcast the lock details to aid UI feedback (like highlighting the element)
    io.to(roomId).emit("object-locked", { elementId, userId, username, color });
  });

  /**
   * Event: unlock-object
   * Active alternative event for unlocking (triggered when finishing a shape/stroke).
   */
  socket.on("unlock-object", ({ roomId, elementId }) => {
    const roomLocksMap = roomLocks.get(roomId);
    // Look up and remove the specific element lock
    if (roomLocksMap && roomLocksMap[elementId]) {
      delete roomLocksMap[elementId];

      // Broadcast the unlocking so others know they can now select/edit the element
      io.to(roomId).emit("object-unlocked", { elementId });
    }
  });

  /**
   * Event: clear-canvas
   * Resets the entire drawing state for the room.
   */
  socket.on("clear-canvas", async ({ roomId }) => {
    // Trigger an immediate UI clear for all connected participants
    io.to(roomId).emit("canvas-cleared");
    // Wipe the local volatile buffer for this room
    drawingBuffer.set(roomId, []);
    try {
      // Clear the persistent drawing data in the database
      await Room.findByIdAndUpdate(roomId, { drawingData: [] });
    } catch (err) {
      // Log errors if the database reset fails
      console.error("Clear canvas DB update failed:", err);
    }
  });

  /**
   * Event: save-canvas
   * Explicitly saves the current full element array for a room.
   * Emitted by the frontend's useAutoSave hook every 30 seconds and on Ctrl+S.
   * Also creates a CanvasVersion snapshot for history.
   *
   * Payload: { roomId, elements: DrawingElement[], timestamp, userId }
   */
  socket.on('save-canvas', async ({ roomId, elements, timestamp, userId }) => {
    if (!roomId || !Array.isArray(elements)) {
      socket.emit('save-error', { error: 'Invalid save payload' });
      return;
    }

    try {
      // Overwrite the room's live drawing data
      await Room.findByIdAndUpdate(roomId, {
        drawingData: elements,
        updatedAt: new Date(),
      });

      // Create a versioned snapshot
      const snapshot = new CanvasVersion({
        room: roomId,
        savedBy: userId || null,
        elements,
        label: 'Auto-save',
        isAutoSave: true,
      });
      await snapshot.save();

      // Rotate old auto-saves – keep at most 20
      const autoCount = await CanvasVersion.countDocuments({ room: roomId, isAutoSave: true });
      if (autoCount > 20) {
        const oldest = await CanvasVersion.find(
          { room: roomId, isAutoSave: true },
          { _id: 1 },
          { sort: { createdAt: 1 }, limit: autoCount - 20 }
        );
        await CanvasVersion.deleteMany({ _id: { $in: oldest.map((v) => v._id) } });
      }

      // Confirm back to the saving client
      socket.emit('save-confirmed', {
        timestamp: timestamp || Date.now(),
        versionId: snapshot._id,
      });
    } catch (err) {
      console.error('save-canvas error:', err);
      socket.emit('save-error', { error: 'Failed to persist canvas' });
    }
  });

  /**
   * Event: kick-participant
   * Moderation action: forcefully removes a user and revokes their membership.
   */
  socket.on(
    "kick-participant",
    async ({ roomId, targetUserId, moderatorId }) => {
      try {
        // Authenticate that the person demanding the kick is actually a moderator/owner
        const moderator = await Participant.findOne({
          user: moderatorId,
          room: roomId,
        });

        // If requester is not authorized, abort
        if (!moderator || !["owner", "moderator"].includes(moderator.role)) {
          return socket.emit("error", { message: "Not authorized" });
        }

        // Find the specific membership record for the user to be kicked
        const targetParticipant = await Participant.findOne({
          user: targetUserId,
          room: roomId,
        });

        // Ensure the target is actually found in the room
        if (!targetParticipant) {
          return socket.emit("error", { message: "Participant not found" });
        }

        // Remove the target from the Room's participant list
        await Room.findByIdAndUpdate(roomId, {
          $pull: { participants: targetParticipant._id },
        });

        // Delete the participant record from the database
        await Participant.findByIdAndDelete(targetParticipant._id);

        // Notify everyone that the user has been kicked
        io.to(roomId).emit("participant-kicked", { userId: targetUserId });

        // Broadcast the updated participant list for the UI
        const participantsList = await getParticipantsList(roomId);
        io.to(roomId).emit("participants-updated", {
          participants: participantsList,
        });
      } catch (error) {
        // Handle common database or logic errors
        socket.emit("error", { message: "Failed to kick participant" });
      }
    },
  );

  /**
   * Event: ban-participant
   * Moderation action: removes a user and prevents any future joins.
   */
  socket.on(
    "ban-participant",
    async ({ roomId, targetUserId, moderatorId }) => {
      try {
        // Verify the authority of the user conducting the ban
        const moderator = await Participant.findOne({
          user: moderatorId,
          room: roomId,
        });

        // Rejection for unauthorized requests
        if (!moderator || !["owner", "moderator"].includes(moderator.role)) {
          return socket.emit("error", { message: "Not authorized" });
        }

        // Find the record for the user to be banned
        const targetParticipant = await Participant.findOne({
          user: targetUserId,
          room: roomId,
        });

        // Rejection if user not found
        if (!targetParticipant) {
          return socket.emit("error", { message: "Participant not found" });
        }

        // Set the ban flag to true to permanently exclude this user account
        targetParticipant.isBanned = true;
        // Commit the status change
        await targetParticipant.save();

        // Notify session participants of the ban
        io.to(roomId).emit("participant-banned", { userId: targetUserId });

        // Update the participant roster display
        const participantsList = await getParticipantsList(roomId);
        io.to(roomId).emit("participants-updated", {
          participants: participantsList,
        });
      } catch (error) {
        // Log errors encountered during the ban process
        socket.emit("error", { message: "Failed to ban participant" });
      }
    },
  );

  /**
   * Event: disconnect
   * Cleans up room context, sessions, and locks when a client connection is lost.
   */
  socket.on("disconnect", async () => {
    // Only proceed if the socket was correctly joined to a room
    if (socket.data && socket.data.roomId) {
      // Clear all object locks held by this specific socket ID
      cleanupUserLocks(socket.id);
      // Notify other room members that the user is no longer active
      socket
        .to(socket.data.roomId)
        .emit("user-left", { userId: socket.data.userId });

      // Re-broadcast the updated participant list for accuracy
      const participantsList = await getParticipantsList(socket.data.roomId);
      io.to(socket.data.roomId).emit("participants-updated", {
        participants: participantsList,
      });
    }
  });
};

module.exports = roomSocketHandler;

