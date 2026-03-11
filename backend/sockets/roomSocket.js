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
// Import the Message model for persistent chats
const Message = require("../models/Message");
// Import notification utilities to create persistent notifications on moderation actions
const { createNotification } = require('../controllers/notificationController');
const { sendNotificationViaSocket } = require('./notificationSocket');

// In-memory store for active object locks: { roomId: { objectId: { userId, socketId, username, color, timestamp } } }
const roomLocks = new Map();
// Define how long a lock stays active before being considered stale (30 seconds)
const LOCK_TIMEOUT = 30000;

// ─────────────────────────────────────────────────────────────────────────────
// High-Performance In-Memory Room State (Excalidraw-style)
// ─────────────────────────────────────────────────────────────────────────────
// Structure: { roomId: [decompressedDrawingElements] }
const activeRooms = new Map();

// Import payload decompression utility
const { decompressDrawingData } = require("../utils/payloadDecompression");

// Keep track of which rooms have un-saved changes to optimize DB writes
const pendingSaves = new Set();
// Interval for flushing the memory state to the MongoDB database (5 seconds)
const FLUSH_INTERVAL = 5000;

// Per-element last-modified timestamps for server-side conflict resolution (LWW)
// Structure: { roomId: { elementId: { timestamp, version } } }
const elementVersions = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// Stale lock sweeper — runs every 10 s, force-unlocks any lock older than
// LOCK_TIMEOUT so idle/crashed clients don't permanently hold elements.
// ─────────────────────────────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  roomLocks.forEach((locks, roomId) => {
    Object.keys(locks).forEach((elementId) => {
      const lock = locks[elementId];
      if (now - lock.timestamp > LOCK_TIMEOUT) {
        delete locks[elementId];
        // Notify all clients in the room that this lock has expired
        // Uses both new and legacy event names for full compatibility
        const { Server } = require('socket.io');
        // We can't access `io` here, so we store a reference at module level
        if (globalIo) {
          globalIo.to(roomId).emit('force-unlock', { elementId, reason: 'timeout' });
          globalIo.to(roomId).emit('object-unlocked', { elementId, reason: 'timeout' });
        }
      }
    });
  });
}, 10000);

// Module-level io reference populated by the first roomSocketHandler call
let globalIo = null;

/**
 * Main handler for room-related socket events.
 * 
 * @function roomSocketHandler
 * @param {import('socket.io').Server} io - Socket.io server instance.
 * @param {import('socket.io').Socket} socket - Socket instance for a specific client.
 */
const roomSocketHandler = (io, socket) => {
  // Store global io reference for the stale lock sweeper
  if (!globalIo) globalIo = io;
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
      // Get the set of socket IDs currently in this room from the adapter
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (!socketsInRoom || socketsInRoom.size === 0) return [];

      // Collect unique live user IDs from socket.data
      const liveUserIds = new Set();
      for (const sid of socketsInRoom) {
        const s = io.sockets.sockets.get(sid);
        if (s && s.data && s.data.userId) {
          liveUserIds.add(s.data.userId);
        }
      }

      if (liveUserIds.size === 0) return [];

      // Query only the participants that are currently connected
      const participants = await Participant.find({
        room: roomId,
        user: { $in: Array.from(liveUserIds) },
        isBanned: false,
      })
        // Populate foreign keys with specific display-oriented user fields
        .populate("user", "username email avatar");

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
      console.error("Error getting participants list:", error);
      return [];
    }
  };

  // Setup a background interval to periodically persist authoritative drawing data to the database
  const flushBufferInterval = setInterval(async () => {
    // Iterate through all rooms that have pending un-saved changes
    for (const roomId of pendingSaves) {
      const elements = activeRooms.get(roomId);

      if (elements && elements.length > 0) {
        try {
          // Overwrite the entire drawing data field with the authoritative memory state
          await Room.findByIdAndUpdate(roomId, {
            drawingData: elements,
            updatedAt: new Date()
          });
          // Remove room from pending saves after successful flush
          pendingSaves.delete(roomId);
        } catch (err) {
          // Log errors if the batch write operation fails
          console.error(`Failed to flush memory state for room ${roomId}:`, err);
        }
      } else if (elements && elements.length === 0) {
        // Handle edge case where canvas was cleared
        try {
          await Room.findByIdAndUpdate(roomId, { drawingData: [], updatedAt: new Date() });
          pendingSaves.delete(roomId);
        } catch (e) { }
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

      // Initialize authoritative memory state for the room if it doesn't exist
      if (!activeRooms.has(resolvedRoomId)) {
        activeRooms.set(resolvedRoomId, room.drawingData || []);
      }

      // Synchronize client with the high-performance memory state
      const authoritativeState = activeRooms.get(resolvedRoomId);

      // Retrieve any active object locks currently held for this room in memory
      const currentLocks = roomLocks.get(resolvedRoomId) || {};

      // Send the complete room state to the newly joined client for initial synchronization
      // Include the resolvedRoomId so the frontend uses the canonical _id for all socket events
      socket.emit("room-state", {
        room,
        drawingData: authoritativeState,
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
   * Connection health monitoring — echoes back id and server timestamp so the
   * client can calculate round-trip latency.
   *
   * Payload: { id: number, timestamp?: number } | acknowledgement callback
   */
  socket.on('ping', (data, cb) => {
    // Support both: ping(callback) and ping({ id, timestamp }, callback)
    if (typeof data === 'function') {
      // Legacy: ping(cb) — just acknowledge
      data({ id: Date.now(), timestamp: Date.now() });
    } else if (typeof cb === 'function') {
      // New: ping({ id, timestamp }, cb) — echo back the id + server time
      cb({ id: data && data.id ? data.id : Date.now(), timestamp: Date.now() });
    }
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
   * Broadcasts drawing strokes/elements and immediately applies them to memory.
   * Implements last-write-wins conflict resolution using per-element timestamps.
   */
  socket.on('drawing-update', (data) => {
    // ── Pre-process elements to handle both single and compressed arrays ──
    let elementsToProcess = [];

    if (data.compressed && Array.isArray(data.elements)) {
      // Decompress incoming elements first
      elementsToProcess = decompressDrawingData(data.elements);
    } else if (data.element) {
      elementsToProcess = [data.element];
    } else if (Array.isArray(data.elements)) {
      elementsToProcess = data.elements;
    }

    // Broadcast decompressed elements individually to bypass the frontend bug
    // where it drops the rest of the array (decompressed[0]) during live sync.
    if (elementsToProcess.length > 0) {
      elementsToProcess.forEach(el => {
        socket.to(data.roomId).emit('drawing-update', {
          roomId: data.roomId,
          element: el,
          compressed: false,
          saveToDb: false // Sender handles persistence trigger
        });
      });
    }

    if (elementsToProcess.length === 0 || !data.saveToDb) return;

    if (!elementVersions.has(data.roomId)) {
      elementVersions.set(data.roomId, {});
    }
    const versions = elementVersions.get(data.roomId);

    // Ensure the room exists in the authoritative memory state
    if (!activeRooms.has(data.roomId)) {
      activeRooms.set(data.roomId, []);
    }
    const authoritativeState = activeRooms.get(data.roomId);

    elementsToProcess.forEach(element => {
      if (!element || !element.id) return;

      const elementId = element.id;

      // ── Conflict Resolution (LWW per element) ──────────────────────────────
      const incomingTs = element.updatedAt || element._clientTs || Date.now();
      const existing = versions[elementId];

      if (existing && existing.timestamp > incomingTs) {
        // Server already has a newer version — reject silently (client is behind)
        return;
      }

      // Accept this version
      versions[elementId] = { timestamp: incomingTs, version: (existing ? existing.version + 1 : 1) };

      // Update the authoritative in-memory state
      const elementIndex = authoritativeState.findIndex(el => el.id === elementId);
      if (elementIndex !== -1) {
        // Replace existing element
        authoritativeState[elementIndex] = element;
      } else {
        // Push new element
        authoritativeState.push(element);
      }
    });

    // Mark room as needing a background DB save
    pendingSaves.add(data.roomId);
  });

  /**
   * Event: request-lock
   * Requests an exclusive lock on a drawing element.
   * Emits `lock-granted` (new) and `object-locked` (legacy) on success.
   * Emits `lock-denied` on failure.
   */
  socket.on('request-lock', ({ roomId, objectId, elementId, userId, username, color }) => {
    // Support both objectId (legacy) and elementId (new)
    const id = elementId || objectId;
    if (!id || !roomId) return;

    if (!roomLocks.has(roomId)) roomLocks.set(roomId, {});
    const roomLocksMap = roomLocks.get(roomId);
    const currentLock = roomLocksMap[id];
    const now = Date.now();

    // If locked by someone else and within timeout window → deny
    if (currentLock && currentLock.userId !== userId && now - currentLock.timestamp < LOCK_TIMEOUT) {
      socket.emit('lock-denied', { elementId: id, objectId: id, lockedBy: currentLock.userId, reason: 'locked' });
      return;
    }

    // Grant the lock
    roomLocksMap[id] = { userId, socketId: socket.id, username: username || 'User', color: color || '#3b82f6', timestamp: now };

    // Emit new-style `lock-granted` to everyone (so other clients see the lock indicator)
    io.to(roomId).emit('lock-granted', { elementId: id, userId, username: username || 'User', color: color || '#3b82f6' });
    // Also emit legacy `object-locked` for backward compatibility
    io.to(roomId).emit('object-locked', { elementId: id, objectId: id, userId, username: username || 'User', color: color || '#3b82f6' });
  });

  /**
   * Event: release-lock
   * Explicitly releases a lock on a drawing element.
   * Emits `lock-released` (new) and `object-unlocked` (legacy).
   */
  socket.on('release-lock', ({ roomId, objectId, elementId, userId, isAutoRelease }) => {
    const id = elementId || objectId;
    if (!id || !roomId) return;

    const roomLocksMap = roomLocks.get(roomId);
    if (roomLocksMap && roomLocksMap[id] && roomLocksMap[id].userId === userId) {
      delete roomLocksMap[id];
      io.to(roomId).emit('lock-released', { elementId: id, userId, isAutoRelease: !!isAutoRelease });
      io.to(roomId).emit('object-unlocked', { elementId: id, objectId: id, userId });
    }
  });

  /**
   * Event: lock-object (legacy alias — kept for backward compatibility).
   * Behaves identically to request-lock.
   */
  socket.on('lock-object', ({ roomId, elementId, userId, username, color }) => {
    if (!elementId || !roomId) return;
    if (!roomLocks.has(roomId)) roomLocks.set(roomId, {});
    const roomLocksMap = roomLocks.get(roomId);
    roomLocksMap[elementId] = { userId, socketId: socket.id, username: username || 'User', color: color || '#3b82f6', timestamp: Date.now() };
    io.to(roomId).emit('lock-granted', { elementId, userId, username: username || 'User', color: color || '#3b82f6' });
    io.to(roomId).emit('object-locked', { elementId, userId, username: username || 'User', color: color || '#3b82f6' });
  });

  /**
   * Event: unlock-object (legacy alias — kept for backward compatibility).
   * Behaves identically to release-lock.
   */
  socket.on('unlock-object', ({ roomId, elementId, userId }) => {
    if (!elementId || !roomId) return;
    const roomLocksMap = roomLocks.get(roomId);
    if (roomLocksMap && roomLocksMap[elementId]) {
      delete roomLocksMap[elementId];
      io.to(roomId).emit('lock-released', { elementId, userId });
      io.to(roomId).emit('object-unlocked', { elementId });
    }
  });

  /**
   * Event: canvas-sync
   * Receives the full drawing state from a client (e.g. after undo/redo)
   * and broadcasts it to all other users in the room.
   */
  socket.on("canvas-sync", ({ roomId, elements }) => {
    if (!roomId || !Array.isArray(elements)) return;

    // Update the authoritative in-memory state
    activeRooms.set(roomId, elements);
    pendingSaves.add(roomId);

    // Broadcast the full state to all other clients
    socket.to(roomId).emit("canvas-sync", { elements });
  });

  /**
   * Event: clear-canvas
   * Resets the entire drawing state for the room.
   */
  socket.on("clear-canvas", async ({ roomId }) => {
    // Trigger an immediate UI clear for all connected participants
    io.to(roomId).emit("canvas-cleared");
    // Clear the active authoritative memory state
    activeRooms.set(roomId, []);
    pendingSaves.add(roomId);
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
      // Decompress incoming elements if needed before applying to authoritative state
      let elementsToSave = elements;

      // Update memory state
      activeRooms.set(roomId, elementsToSave);

      // Write explicitly to DB (since save-canvas is an explicit action)
      await Room.findByIdAndUpdate(roomId, {
        drawingData: elementsToSave,
        updatedAt: new Date(),
      });
      // Clear pending saves since we did a hard commit
      pendingSaves.delete(roomId);

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
   * Event: request-sync
   * State reconciliation on reconnection (5.3.4).
   * A client emits this after reconnecting to get the full authoritative canvas
   * state + the current lock map so it can reconcile its local queue.
   *
   * Payload: { roomId, lastSyncTimestamp?: number }
   * Response (room-state event back to requesting socket):
   *   { drawingData, resolvedRoomId, locks, participants, serverTimestamp }
   */
  socket.on('request-sync', async ({ roomId, lastSyncTimestamp }) => {
    if (!roomId) return;

    try {
      const room = await Room.findById(roomId).lean();
      if (!room) {
        socket.emit('sync-error', { error: 'Room not found' });
        return;
      }

      // Collect active locks for this room
      const lockMap = roomLocks.get(roomId) || {};
      const activeLocks = Object.entries(lockMap).map(([elementId, lock]) => ({
        elementId,
        userId: lock.userId,
        username: lock.username,
        color: lock.color,
        timestamp: lock.timestamp,
      }));

      // Get current participants
      const participantsList = await getParticipantsList(roomId);

      // Synchronize client with the high-performance memory state
      // Provide fallback gracefully if room not active in memory yet
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, room.drawingData || []);
      }
      const authoritativeState = activeRooms.get(roomId);

      // If the client provides a lastSyncTimestamp, we could delta-filter but
      // since elements don't have server-side timestamps yet, send the full state.
      socket.emit('room-state', {
        drawingData: authoritativeState,
        resolvedRoomId: room._id,
        locks: activeLocks,
        participants: participantsList,
        serverTimestamp: Date.now(),
        isSyncResponse: true,
      });
    } catch (err) {
      console.error('request-sync error:', err);
      socket.emit('sync-error', { error: 'Failed to sync state' });
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

        // Create a persistent notification for the kicked user
        const room = await Room.findById(roomId);
        const notification = await createNotification(
          targetUserId,
          'kick',
          'Removed from Room',
          `You have been removed from the room "${room?.name || 'Unknown'}" by a moderator.`,
          { relatedRoomId: roomId, relatedUserId: moderatorId }
        );
        if (notification) {
          sendNotificationViaSocket(io, targetUserId, 'kick', notification.title, notification.message, {
            relatedUserId: moderatorId,
            relatedRoomId: roomId
          });
        }

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

        // Create a persistent notification for the banned user
        const room = await Room.findById(roomId);
        const notification = await createNotification(
          targetUserId,
          'ban',
          'Banned from Room',
          `You have been banned from the room "${room?.name || 'Unknown'}" by a moderator.`,
          { relatedRoomId: roomId, relatedUserId: moderatorId }
        );
        if (notification) {
          sendNotificationViaSocket(io, targetUserId, 'ban', notification.title, notification.message, {
            relatedUserId: moderatorId,
            relatedRoomId: roomId
          });
        }

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
  /**
   * Event: request-participants
   * Allows a client to explicitly request the current live participant list.
   */
  socket.on("request-participants", async ({ roomId }) => {
    if (!roomId) return;
    try {
      const participantsList = await getParticipantsList(roomId);
      socket.emit("participants-updated", { participants: participantsList });
    } catch (error) {
      console.error("Failed to send participants:", error);
    }
  });

  /**
   * Event: load-messages
   * Requests the latest chat messages for the room.
   */
  socket.on("load-messages", async ({ roomId }) => {
    if (!roomId) return;
    try {
      const messages = await Message.find({ room: roomId })
        .sort({ createdAt: 1 })
        .limit(100)
        .lean();

      // Format for frontend
      const formattedMessages = messages.map((m) => ({
        id: m._id.toString(),
        userId: m.user.toString(),
        username: m.username,
        text: m.text,
        timestamp: m.createdAt,
        isEdited: m.isEdited,
        isDeleted: m.isDeleted,
      }));

      socket.emit("messages-loaded", formattedMessages);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  });

  /**
   * Event: chat-message
   * Saves a new chat message to DB and broadcasts it to everyone in the room.
   */
  socket.on("chat-message", async ({ roomId, userId, username, message }) => {
    if (!roomId || !userId) return;
    try {
      const newMessage = new Message({
        room: roomId,
        user: userId,
        username,
        text: message,
      });
      await newMessage.save();

      io.to(roomId).emit("chat-message", {
        id: newMessage._id.toString(),
        userId,
        username,
        text: message,
        timestamp: newMessage.createdAt,
        isEdited: false,
        isDeleted: false,
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  });

  /**
   * Event: edit-message
   * Edits an existing message and broadcasts the update.
   */
  socket.on("edit-message", async ({ roomId, messageId, userId, newText }) => {
    if (!roomId || !messageId || !userId) return;
    try {
      const message = await Message.findById(messageId);
      if (!message || message.user.toString() !== userId) return; // Only owner can edit

      message.text = newText;
      message.isEdited = true;
      await message.save();

      io.to(roomId).emit("message-edited", {
        id: messageId,
        text: newText,
        isEdited: true,
      });
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  });

  /**
   * Event: delete-message
   * Soft-deletes a message and broadcasts the update.
   */
  socket.on("delete-message", async ({ roomId, messageId, userId }) => {
    if (!roomId || !messageId || !userId) return;
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      // Allow owner or room moderators to delete
      // To keep it simple, checking if the current user is the author
      if (message.user.toString() !== userId) return;

      message.isDeleted = true;
      message.text = "This message was deleted";
      await message.save();

      io.to(roomId).emit("message-deleted", {
        id: messageId,
        text: message.text,
        isDeleted: true,
      });
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  });
};

module.exports = roomSocketHandler;

