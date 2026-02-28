/**
 * @fileoverview CanvasVersion model — stores point-in-time snapshots of a room's drawing data.
 * Each document represents one auto-save or manual-save event for a specific room.
 */

const mongoose = require('mongoose');

/**
 * Schema for a single canvas version snapshot.
 *
 * @typedef {Object} CanvasVersion
 * @property {mongoose.Types.ObjectId} room      - Reference to the Room document.
 * @property {mongoose.Types.ObjectId} savedBy   - User who triggered the save.
 * @property {Array}  elements                   - Full copy of all drawing elements at save time.
 * @property {string} label                      - Optional human-readable label (e.g. "Auto-save", "Manual save").
 * @property {boolean} isAutoSave                - True when triggered automatically by the canvas hook.
 * @property {Date}   createdAt                  - Timestamp of the snapshot.
 */
const canvasVersionSchema = new mongoose.Schema({
  // The room this snapshot belongs to
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true,
  },

  // The user who initiated the save (optional for beacon/emergency saves)
  savedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  // Full serialised drawing element array captured at save time
  elements: {
    type: Array,
    default: [],
  },

  // Human-readable description of the snapshot
  label: {
    type: String,
    default: 'Auto-save',
    maxlength: 100,
  },

  // Differentiates auto-saves from explicit manual saves
  isAutoSave: {
    type: Boolean,
    default: true,
  },

  // Creation timestamp (acts as the version point-in-time)
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to quickly retrieve versions for a room in chronological order
canvasVersionSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('CanvasVersion', canvasVersionSchema);
