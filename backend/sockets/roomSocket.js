const Participant = require("../models/Participant");
const Room = require("../models/Room");

const roomSocketHandler = (io, socket) => {
  // Join room
  socket.on("join-room", async ({ roomId, userId }) => {
    try {
      const participant = await Participant.findOne({
        user: userId,
        room: roomId,
      }).populate("user", "username");

      if (!participant || participant.isBanned) return;

      socket.join(roomId);
      socket.to(roomId).emit("user-joined", {
        user: participant.user.username,
        role: participant.role,
      });

      // Send current room state
      const room = await Room.findById(roomId).populate("participants");
      socket.emit("room-state", {
        room,
        drawingData: room.drawingData,
      });
    } catch (error) {
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  // Leave room
  socket.on("leave-room", async ({ roomId, userId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { userId });
  });

  // Real-time drawing updates
  socket.on("drawing-update", (data) => {
    socket.to(data.roomId).emit("drawing-update", data);
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
      } catch (error) {
        socket.emit("error", { message: "Failed to kick participant" });
      }
    },
  );
};

module.exports = roomSocketHandler;
