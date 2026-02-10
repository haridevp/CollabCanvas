const Notification = require("../models/Notification");

const notificationSocketHandler = (io, socket) => {
  // Join user's notification room (socket subscribes to their personal notifications)
  socket.on("subscribe-notifications", ({ userId }) => {
    socket.join(`user:${userId}:notifications`);
  });

  // Unsubscribe from notifications
  socket.on("unsubscribe-notifications", ({ userId }) => {
    socket.leave(`user:${userId}:notifications`);
  });

  // Listen for new notifications and broadcast to recipient
  socket.on("send-notification", async (data) => {
    try {
      const {
        recipientId,
        type,
        title,
        message,
        relatedUser,
        relatedRoom,
        actionUrl,
      } = data;

      const notification = new Notification({
        recipient: recipientId,
        type,
        title,
        message,
        relatedUser,
        relatedRoom,
        actionUrl,
      });

      await notification.save();

      // Populate related data
      const populatedNotification = await Notification.findById(
        notification._id,
      )
        .populate("relatedUser", "username avatar")
        .populate("relatedRoom", "name roomCode");

      // Broadcast to recipient's notification room
      io.to(`user:${recipientId}:notifications`).emit("new-notification", {
        notification: populatedNotification,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    // Cleanup is automatic with socket.io
  });
};

// Helper function to send notification via Socket.IO
const sendNotificationViaSocket = (
  io,
  recipientId,
  type,
  title,
  message,
  options = {},
) => {
  io.emit("send-notification", {
    recipientId,
    type,
    title,
    message,
    relatedUser: options.relatedUserId,
    relatedRoom: options.relatedRoomId,
    actionUrl: options.actionUrl,
  });
};

module.exports = { notificationSocketHandler, sendNotificationViaSocket };
