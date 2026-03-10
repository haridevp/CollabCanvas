/**
 * @fileoverview Room model schema definition for collaborative drawing rooms.
 */

// Import mongoose library for MongoDB schema creation
const mongoose = require("mongoose");
// Import bcryptjs for secure password hashing and comparison
const bcrypt = require("bcryptjs");

/**
 * Mongoose schema for drawing rooms.
 * 
 * @typedef {Object} Room
 * @property {string} name - The name of the room.
 * @property {string} [description] - A brief description of the room.
 * @property {string} roomCode - Unique uppercase alphanumeric room code.
 * @property {string} visibility - Visibility level ("public" or "private").
 * @property {string} [password] - Hashed password for private rooms.
 * @property {mongoose.Types.ObjectId} owner - The user who created the room.
 * @property {Array<mongoose.Types.ObjectId>} participants - List of participants in the room.
 * @property {boolean} isActive - Whether the room is currently active.
 * @property {Array<Object>} drawingData - Collaborative drawing state (array of stroke/element data).
 * @property {Date} createdAt - Timestamp when the room was created.
 * @property {Date} updatedAt - Timestamp when the room was last updated.
 */
const roomSchema = new mongoose.Schema({
  // Friendly name for the room, required and trimmed
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  // Optional long-form description of the room purpose
  description: {
    type: String,
    maxlength: 500,
  },
  // Unique 4-character code used to identify and join the room
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  // Access control tier: public (listed) or private (password protected)
  visibility: {
    type: String,
    enum: ["public", "private"],
    default: "public",
  },
  // Hashed password string for private room authentication
  password: {
    type: String,
  },
  // Reference to the User who created and manages the room
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Collection of participant records associated with this room
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
    },
  ],
  // Maximum number of users allowed in the room at any one time
  maxParticipants: {
    type: Number,
    default: 10,
    min: 2,
  },
  // Soft-delete flag; false indicates the room is closed or deleted
  isActive: {
    type: Boolean,
    default: true,
  },
  // JSON array storing the persistent state of all drawing elements on the canvas
  drawingData: {
    type: Array,
    default: [],
  },
  // Auto-populated timestamp of room creation
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Timestamp that updates whenever the room metadata or elements change
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Pre-save middleware to update the updatedAt timestamp and hash the room password if modified.
 */
roomSchema.pre("save", async function (next) {
  // Always update the 'updatedAt' timestamp before saving any changes
  this.updatedAt = Date.now();

  // Only perform hashing if the 'password' field has been changed and is not empty
  if (this.isModified("password") && this.password) {
    try {
      // Generate a security salt with a cost factor of 10
      const salt = await bcrypt.genSalt(10);
      // Replace the plain text password with its secure hashed version
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      // Pass any cryptographic errors to the next middleware
      next(error);
    }
  }

  // Proceed with the save operation
  next();
});

/**
 * Compares a plain text password with the hashed room password.
 * 
 * @async
 * @method comparePassword
 * @param {string} plainPassword - The plain text password to check.
 * @returns {Promise<boolean>} True if passwords match, false otherwise.
 */
roomSchema.methods.comparePassword = async function (plainPassword) {
  // Use bcrypt to securely compare the incoming text with the stored hash
  return bcrypt.compare(plainPassword, this.password);
};

// Compile and export the 'Room' model
module.exports = mongoose.model("Room", roomSchema);


