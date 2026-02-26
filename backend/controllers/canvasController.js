/**
 * @fileoverview Canvas controller — REST handlers for saving, versioning, and
 * restoring the collaborative drawing state of a room.
 *
 * Endpoints:
 *   POST /api/rooms/:id/canvas/save       — Save (or snapshot) current drawing elements.
 *   GET  /api/rooms/:id/canvas/versions   — List recent canvas version snapshots.
 *   POST /api/rooms/:id/canvas/restore/:versionId — Restore a specific snapshot.
 */

const mongoose = require('mongoose');
const Room = require('../models/Room');
const CanvasVersion = require('../models/CanvasVersion');
const Participant = require('../models/Participant');

// Maximum number of auto-save versions to retain per room before rotating old ones
const MAX_AUTO_VERSIONS = 20;
// Maximum number of manual-save versions to retain per room
const MAX_MANUAL_VERSIONS = 50;

/**
 * Resolve a room by either its MongoDB ObjectId or its roomCode string.
 *
 * @private
 * @param {string} id - The value from req.params.id.
 * @returns {Promise<import('../models/Room')|null>}
 */
async function resolveRoom(id) {
  const query = { isActive: true };
  if (mongoose.Types.ObjectId.isValid(id)) {
    query.$or = [{ _id: id }, { roomCode: id }];
  } else {
    query.roomCode = id;
  }
  return Room.findOne(query);
}

/**
 * Check that the requesting user is a participant (or owner) of a room.
 *
 * @private
 * @param {string} roomId   - Resolved MongoDB room _id.
 * @param {string} userId   - Requesting user _id.
 * @returns {Promise<boolean>}
 */
async function isRoomMember(roomId, userId) {
  const participant = await Participant.findOne({
    room: roomId,
    user: userId,
    isBanned: false,
  });
  return !!participant;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rooms/:id/canvas/save
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Save (overwrite) the room's live drawing data and optionally create a version
 * snapshot.
 *
 * Body parameters:
 *   elements  {Array}   — Full current drawing element array.
 *   timestamp {number}  — Client-side Unix timestamp of the save.
 *   isAutoSave {boolean} — Whether triggered automatically (default: true).
 *   isEmergency {boolean} — Set to true by sendBeacon before tab closes.
 *   label     {string}  — Optional custom label for manual saves.
 *
 * @async
 * @function saveCanvas
 */
const saveCanvas = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      elements = [],
      isAutoSave = true,
      isEmergency = false,
      label,
    } = req.body;

    // Validate elements is an array
    if (!Array.isArray(elements)) {
      return res.status(400).json({
        success: false,
        message: 'elements must be an array',
      });
    }

    // Resolve the room
    const room = await resolveRoom(id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // For emergency beacon saves the user may not be attached to req
    const userId = req.user ? req.user._id : null;

    // Check membership (skip for authenticated users who are determined to be members)
    if (userId) {
      const member = await isRoomMember(room._id.toString(), userId.toString());
      if (!member) {
        return res.status(403).json({ success: false, message: 'Not a room member' });
      }
    }

    // 1. Overwrite live drawing data on the Room document
    await Room.findByIdAndUpdate(room._id, {
      drawingData: elements,
      updatedAt: new Date(),
    });

    // 2. Create a versioned snapshot for history / undo restoration
    const snapshot = new CanvasVersion({
      room: room._id,
      savedBy: userId,
      elements,
      label: label || (isAutoSave ? 'Auto-save' : 'Manual save'),
      isAutoSave: !!isAutoSave || !!isEmergency,
    });
    await snapshot.save();

    // 3. Rotate old auto-save versions to keep the collection lean
    if (isAutoSave || isEmergency) {
      const autoSaveCount = await CanvasVersion.countDocuments({
        room: room._id,
        isAutoSave: true,
      });

      if (autoSaveCount > MAX_AUTO_VERSIONS) {
        // Find and delete the oldest auto-saves beyond the limit
        const toDelete = await CanvasVersion.find(
          { room: room._id, isAutoSave: true },
          { _id: 1 },
          { sort: { createdAt: 1 }, limit: autoSaveCount - MAX_AUTO_VERSIONS }
        );
        const idsToDelete = toDelete.map((v) => v._id);
        await CanvasVersion.deleteMany({ _id: { $in: idsToDelete } });
      }
    } else {
      // Rotate manual saves
      const manualCount = await CanvasVersion.countDocuments({
        room: room._id,
        isAutoSave: false,
      });
      if (manualCount > MAX_MANUAL_VERSIONS) {
        const toDelete = await CanvasVersion.find(
          { room: room._id, isAutoSave: false },
          { _id: 1 },
          { sort: { createdAt: 1 }, limit: manualCount - MAX_MANUAL_VERSIONS }
        );
        const idsToDelete = toDelete.map((v) => v._id);
        await CanvasVersion.deleteMany({ _id: { $in: idsToDelete } });
      }
    }

    res.json({
      success: true,
      message: 'Canvas saved successfully',
      versionId: snapshot._id,
      timestamp: snapshot.createdAt,
    });
  } catch (error) {
    console.error('Canvas save error:', error);
    res.status(500).json({ success: false, message: 'Failed to save canvas', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rooms/:id/canvas/versions
// ─────────────────────────────────────────────────────────────────────────────
/**
 * List canvas version snapshots for a room, newest first.
 *
 * Query parameters:
 *   limit  {number} — Max versions to return (default: 20, max: 50).
 *   type   {'auto'|'manual'|'all'} — Filter by save type (default: 'all').
 *
 * @async
 * @function getCanvasVersions
 */
const getCanvasVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const type = req.query.type || 'all'; // 'auto' | 'manual' | 'all'

    const room = await resolveRoom(id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Membership gate
    const member = await isRoomMember(room._id.toString(), req.user._id.toString());
    if (!member) {
      return res.status(403).json({ success: false, message: 'Not a room member' });
    }

    // Build filter
    const filter = { room: room._id };
    if (type === 'auto') filter.isAutoSave = true;
    else if (type === 'manual') filter.isAutoSave = false;

    const versions = await CanvasVersion.find(filter, {
      // Exclude the full elements array from the list response — it can be huge.
      // Clients request elements only when they want to restore a specific version.
      elements: 0,
    })
      .populate('savedBy', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formatted = versions.map((v) => ({
      id: v._id,
      label: v.label,
      isAutoSave: v.isAutoSave,
      elementCount: Array.isArray(v.elements) ? v.elements.length : 0,
      savedBy: v.savedBy
        ? { id: v.savedBy._id, username: v.savedBy.username, avatar: v.savedBy.avatar }
        : null,
      createdAt: v.createdAt,
    }));

    res.json({ success: true, versions: formatted, total: formatted.length });
  } catch (error) {
    console.error('Canvas versions fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch canvas versions' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rooms/:id/canvas/restore/:versionId
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Restore the room's drawing data to a specific historical snapshot.
 * Only the room owner or a moderator may restore a version.
 *
 * @async
 * @function restoreCanvasVersion
 */
const restoreCanvasVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;

    const room = await resolveRoom(id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Only owners / moderators may restore
    const participant = await Participant.findOne({
      room: room._id,
      user: req.user._id,
      isBanned: false,
    });
    if (!participant || !['owner', 'moderator'].includes(participant.role)) {
      return res.status(403).json({ success: false, message: 'Only room owners and moderators can restore versions' });
    }

    // Find the requested snapshot
    const version = await CanvasVersion.findOne({
      _id: versionId,
      room: room._id,
    });
    if (!version) {
      return res.status(404).json({ success: false, message: 'Version not found' });
    }

    // Snapshot current state BEFORE restoring (so you can undo the restore)
    const preRestoreSnapshot = new CanvasVersion({
      room: room._id,
      savedBy: req.user._id,
      elements: room.drawingData || [],
      label: `Pre-restore snapshot (before restoring "${version.label}")`,
      isAutoSave: false,
    });
    await preRestoreSnapshot.save();

    // Overwrite live drawing data with the historical snapshot
    await Room.findByIdAndUpdate(room._id, {
      drawingData: version.elements,
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: `Canvas restored to version: ${version.label}`,
      restoredFrom: {
        id: version._id,
        label: version.label,
        createdAt: version.createdAt,
      },
      preRestoreVersionId: preRestoreSnapshot._id,
      elements: version.elements,
    });
  } catch (error) {
    console.error('Canvas restore error:', error);
    res.status(500).json({ success: false, message: 'Failed to restore canvas version' });
  }
};

module.exports = {
  saveCanvas,
  getCanvasVersions,
  restoreCanvasVersion,
};
