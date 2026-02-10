const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: [
      "user_invited_to_room",
      "room_joined",
      "participant_promoted",
      "participant_demoted",
      "participant_kicked",
      "participant_banned",
      "room_updated",
      "comment_mentioned",
      "drawing_shared",
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  relatedRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
  },
  actionUrl: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000, // Auto-delete after 30 days
  },
  readAt: {
    type: Date,
    default: null,
  },
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
