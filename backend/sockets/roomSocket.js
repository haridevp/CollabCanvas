// In-memory store for object locks: { roomId: { objectId: { userId, timestamp } } }
const roomLocks = new Map();
const LOCK_TIMEOUT = 30000; // 30 seconds

// Buffer for drawing updates to batch DB writes: { roomId: [drawingElements] }
const drawingBuffer = new Map();
const FLUSH_INTERVAL = 5000; // 5 seconds

const roomSocketHandler = (io, socket) => {
  // ... (keep existing lock cleanup code) ...
  // Helper to cleanup locks for a user
  const cleanupUserLocks = (socketId) => {
    roomLocks.forEach((locks, roomId) => {
      Object.keys(locks).forEach((objectId) => {
        if (locks[objectId].socketId === socketId) {
          delete locks[objectId];
          io.to(roomId).emit("object-unlocked", { objectId });
        }
      });
    });
  };

  // Periodic flush of drawing buffer to DB
  const flushBufferInterval = setInterval(async () => {
    for (const [roomId, elements] of drawingBuffer.entries()) {
      if (elements.length > 0) {
        try {
          const uniqueElements = [...new Map(elements.map(item => [item.id, item])).values()];
          
          await Room.findByIdAndUpdate(roomId, {
            $push: { drawingData: { $each: uniqueElements } }
          });
          // Clear buffer for this room
          drawingBuffer.set(roomId, []);
        } catch (err) {
          console.error(`Failed to flush buffer for room ${roomId}:`, err);
        }
      }
    }
  }, FLUSH_INTERVAL);

  // Clean up interval on server shutdown (optional, but good practice)
  // process.on('SIGTERM', () => clearInterval(flushBufferInterval));

  // Join room
  socket.on("join-room", async ({ roomId, userId }) => {
    try {
      const participant = await Participant.findOne({
        user: userId,
        room: roomId,
      }).populate("user", "username");

      if (!participant || participant.isBanned) return;

      socket.join(roomId);
      socket.data = { userId, roomId };

      socket.to(roomId).emit("user-joined", {
        user: participant.user.username,
        userId: userId,
        role: participant.role,
      });

      const room = await Room.findById(roomId);
      
      // Combine persistent data with current volatile buffer
      const bufferedData = drawingBuffer.get(roomId) || [];
      const currentDrawingData = [...(room.drawingData || []), ...bufferedData];
      
      const currentLocks = roomLocks.get(roomId) || {};
      
      socket.emit("room-state", {
        room,
        drawingData: currentDrawingData,
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

  // Epic 5.3: Connection health monitoring
  socket.on("ping", (cb) => {
    if (typeof cb === "function") cb();
  });

  // Epic 5.2: Cursor movement
  socket.on("cursor-move", ({ roomId, x, y, userId }) => {
    socket.volatile.to(roomId).emit("cursor-update", { userId, x, y });
  });

  // Epic 5.1 & 5.6: Drawing updates with buffering
  socket.on("drawing-update", (data) => {
    // Broadcast immediately
    socket.to(data.roomId).emit("drawing-update", data);

    // Buffer for persistence if it's a valid element update
    if (data.element && data.saveToDb) {
      if (!drawingBuffer.has(data.roomId)) {
        drawingBuffer.set(data.roomId, []);
      }
      drawingBuffer.get(data.roomId).push(data.element);
    }
  });

  // Epic 5.5: Object Locking
  socket.on("request-lock", ({ roomId, objectId, userId }) => {
    if (!roomLocks.has(roomId)) {
      roomLocks.set(roomId, {});
    }
    
    const roomLocksMap = roomLocks.get(roomId);
    const currentLock = roomLocksMap[objectId];
    const now = Date.now();

    if (currentLock && currentLock.userId !== userId && (now - currentLock.timestamp < LOCK_TIMEOUT)) {
      socket.emit("lock-denied", { objectId, lockedBy: currentLock.userId });
      return;
    }

    roomLocksMap[objectId] = { userId, socketId: socket.id, timestamp: now };
    io.to(roomId).emit("object-locked", { objectId, userId });
  });

  socket.on("release-lock", ({ roomId, objectId, userId }) => {
    const roomLocksMap = roomLocks.get(roomId);
    if (roomLocksMap && roomLocksMap[objectId] && roomLocksMap[objectId].userId === userId) {
      delete roomLocksMap[objectId];
      io.to(roomId).emit("object-unlocked", { objectId });
    }
  });

  // Clear Canvas
  socket.on("clear-canvas", async ({ roomId }) => {
    io.to(roomId).emit("canvas-cleared");
    // Clear buffer too
    drawingBuffer.set(roomId, []);
    try {
      await Room.findByIdAndUpdate(roomId, { drawingData: [] });
    } catch (err) {
      console.error("Clear canvas DB update failed:", err);
    }
  });

  // Kick participant
  socket.on("kick-participant", async ({ roomId, targetUserId, moderatorId }) => {
    // ... (existing kick logic) ...
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
      } catch (error) {
        socket.emit("error", { message: "Failed to kick participant" });
      }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    if (socket.data && socket.data.roomId) {
      cleanupUserLocks(socket.id);
      socket.to(socket.data.roomId).emit("user-left", { userId: socket.data.userId });
    }
  });
};

module.exports = roomSocketHandler;
