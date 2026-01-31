const Participant = require("../models/Participant");
const Room = require("../models/Room");

// In-memory store for object locks: { roomId: { objectId: { userId, timestamp } } }
const roomLocks = new Map();
const LOCK_TIMEOUT = 30000; // 30 seconds

const roomSocketHandler = (io, socket) => {
  // Helper to cleanup locks for a user
  const cleanupUserLocks = (socketId) => {
    // We need to map socketId to userId or store socketId in locks. 
    // Ideally, we store socketId in the lock for easier cleanup.
    roomLocks.forEach((locks, roomId) => {
      Object.keys(locks).forEach((objectId) => {
        if (locks[objectId].socketId === socketId) {
          delete locks[objectId];
          io.to(roomId).emit("object-unlocked", { objectId });
        }
      });
    });
  };

  // Join room
  socket.on("join-room", async ({ roomId, userId }) => {
    try {
      const participant = await Participant.findOne({
        user: userId,
        room: roomId,
      }).populate("user", "username");

      if (!participant || participant.isBanned) return;

      socket.join(roomId);
      // Store userId in socket for disconnect handling
      socket.data = { userId, roomId };

      socket.to(roomId).emit("user-joined", {
        user: participant.user.username,
        userId: userId,
        role: participant.role,
      });

      // Send current room state
      const room = await Room.findById(roomId);
      
      // Get active locks for this room
      const currentLocks = roomLocks.get(roomId) || {};
      
      socket.emit("room-state", {
        room,
        drawingData: room.drawingData || [],
        activeLocks: currentLocks
      });
    } catch (error) {
      console.error(error);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  // Leave room
  socket.on("leave-room", async ({ roomId, userId }) => {
    socket.leave(roomId);
    cleanupUserLocks(socket.id);
    socket.to(roomId).emit("user-left", { userId });
  });

  // Real-time cursor movement (Epic 5.2)
  socket.on("cursor-move", ({ roomId, x, y, userId }) => {
    // Broadcast to others in room (volatile for performance)
    socket.volatile.to(roomId).emit("cursor-update", { userId, x, y });
  });

  // Real-time drawing updates (Epic 5.1 & 5.6)
  socket.on("drawing-update", async (data) => {
    // Broadcast to others
    socket.to(data.roomId).emit("drawing-update", data);

    // If this is a final stroke (saveToDb flag), update DB
    if (data.saveToDb) {
      try {
        await Room.findByIdAndUpdate(data.roomId, {
          $push: { drawingData: data.element } // Assuming drawingData is an array of elements
        });
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }
  });

  // Object Locking (Epic 5.5)
  socket.on("request-lock", ({ roomId, objectId, userId }) => {
    if (!roomLocks.has(roomId)) {
      roomLocks.set(roomId, {});
    }
    
    const roomLocksMap = roomLocks.get(roomId);
    const currentLock = roomLocksMap[objectId];
    const now = Date.now();

    // Check if locked by someone else and not expired
    if (currentLock && currentLock.userId !== userId && (now - currentLock.timestamp < LOCK_TIMEOUT)) {
      socket.emit("lock-denied", { objectId, lockedBy: currentLock.userId });
      return;
    }

    // Grant lock
    roomLocksMap[objectId] = { userId, socketId: socket.id, timestamp: now };
    
    // Broadcast to everyone (including sender to confirm)
    io.to(roomId).emit("object-locked", { objectId, userId });
  });

  socket.on("release-lock", ({ roomId, objectId, userId }) => {
    const roomLocksMap = roomLocks.get(roomId);
    if (roomLocksMap && roomLocksMap[objectId] && roomLocksMap[objectId].userId === userId) {
      delete roomLocksMap[objectId];
      io.to(roomId).emit("object-unlocked", { objectId });
    }
  });

  // Clear Canvas Feature (Epic 4.1.7)
  socket.on("clear-canvas", async ({ roomId }) => {
    io.to(roomId).emit("canvas-cleared");
    try {
      await Room.findByIdAndUpdate(roomId, { drawingData: [] });
    } catch (err) {
      console.error("Clear canvas DB update failed:", err);
    }
  });

  // Kick participant
  socket.on(
    "kick-participant",
    async ({ roomId, targetUserId, moderatorId }) => {
      try {
        const moderator = await Participant.findOne({
          user: moderatorId,
          room: roomId,
        });

        if (!moderator || !["owner", "moderator"].includes(moderator.role)) {
          return socket.emit("error", { message: "Not authorized" });
        }

        await Participant.findOneAndUpdate(
          { user: targetUserId, room: roomId },
          { isBanned: true },
        );

        io.to(roomId).emit("participant-kicked", { userId: targetUserId });
        
        // Find socket of kicked user and force leave if possible (requires mapping)
        // For now, client handles the event.
      } catch (error) {
        socket.emit("error", { message: "Failed to kick participant" });
      }
    },
  );

  // Handle disconnect
  socket.on("disconnect", () => {
    if (socket.data && socket.data.roomId) {
      cleanupUserLocks(socket.id);
      socket.to(socket.data.roomId).emit("user-left", { userId: socket.data.userId });
    }
  });
};

module.exports = roomSocketHandler;
