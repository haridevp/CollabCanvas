const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  visibility: {
    type: String,
    enum: ["public", "private"],
    default: "public",
  },
  password: {
    type: String, // Hashed password for private rooms
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  drawingData: {
    type: Object, // Store collaborative drawing state
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

roomSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Room", roomSchema);
