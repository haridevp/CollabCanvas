/**
 * @fileoverview Controller for managing room participants, roles, and moderation.
 */

// Import the Participant model to manage room-user relationships
const Participant = require("../models/Participant");
// Import the Room model to validate room ownership and status
const Room = require("../models/Room");
// Import the User model as it's the foundation for all participants
const User = require("../models/User");

/**
 * Fetches all participants in a specific room.
 * 
 * @async
 * @function getRoomParticipants
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const getRoomParticipants = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Verify that the requesting user is actually an active member of this room
    const userParticipant = await Participant.findOne({
      user: req.user._id,
      room: roomId,
      isBanned: { $ne: true },
    });

    // If no active membership is found, deny access to the participant list
    if (!userParticipant) {
      return res.status(403).json({ success: false, error: "Not authorized for this room" });
    }

    // Retrieve all non-banned participants for the specified room
    const participants = await Participant.find({
      room: roomId,
      isBanned: { $ne: true }, // exclude banned users
    })
      // Populate user field with basic account credentials and avatar
      .populate("user", "username email avatar")
      // Sort by join time ascending (oldest members first)
      .sort({ joinedAt: 1 });

    // Respond with success flag, list, and convenience count
    res.json({
      success: true,
      participants,
      count: participants.length,
    });
  } catch (error) {
    // Return a 400 status if a database or logic error occurs
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Assigns a role to a participant (owner only).
 * 
 * @async
 * @function assignRole
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const assignRole = async (req, res) => {
  try {
    // Extract room and target participant IDs from parameters
    const { roomId, participantId } = req.params;
    // Extract the new role (e.g., 'moderator') from the request body
    const { role } = req.body; 

    // Look up the room and populate the owner details to verify authority
    const room = await Room.findById(roomId).populate("owner");
    // If the room doesn't exist or the requester is not the owner, refuse the update
    if (!room || String(room.owner._id) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only room owner can assign roles" });
    }

    // Update the participant's role in the database
    const participant = await Participant.findOneAndUpdate(
      // Match the specific participant record in this specific room
      { _id: participantId, room: roomId },
      // Update the role field
      { role },
      // Return the newly updated document
      { new: true },
    ).populate("user", "username");

    // Return the updated role data to the client
    res.json({
      success: true,
      participant: {
        id: participant._id,
        user: participant.user.username,
        role: participant.role,
      },
    });
  } catch (error) {
    // Return error status if the update fails
    res.status(400).json({ error: error.message });
  }
};

/**
 * Kicks a participant from a room (owner/moderator only).
 * 
 * @async
 * @function kickParticipant
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const kickParticipant = async (req, res) => {
  try {
    // Get room and participant IDs from the URL
    const { roomId, participantId } = req.params;

    // Check if the user making the request has moderation rights in the room
    const requester = await Participant.findOne({
      user: req.user._id,
      room: roomId,
    });

    // If the requester is not found or is neither an owner nor a moderator, deny access
    if (!requester || !["owner", "moderator"].includes(requester.role)) {
      return res
        .status(403)
        .json({ error: "Not authorized to kick participants" });
    }

    // Retrieve the target participant record to ensure we aren't kicking the owner
    const targetParticipant = await Participant.findById(participantId);
    // Safety check: protect against malformed requests or owner removal
    if (
      !targetParticipant ||
      String(targetParticipant.user) === String(req.user._id)
    ) {
      return res.status(400).json({ error: "Cannot kick room owner" });
    }

    // Atomically remove the participant ID from the Room's participant array
    await Room.findByIdAndUpdate(roomId, {
      $pull: { participants: participantId },
    });

    // Delete the participant record from the collection
    await Participant.findByIdAndDelete(participantId);

    // Confirm the user has been removed
    res.json({ success: true, message: "Participant kicked successfully" });
  } catch (error) {
    // Return error status on failure
    res.status(400).json({ error: error.message });
  }
};

/**
 * Bans a participant from a room (owner/moderator only).
 * 
 * @async
 * @function banParticipant
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const banParticipant = async (req, res) => {
  try {
    // Extract ID parameters for the room and the target user
    const { roomId, participantId } = req.params;

    // Verify that the person making the call has moderation authority
    const requester = await Participant.findOne({
      user: req.user._id,
      room: roomId,
    });

    // If requester is not permitted, refuse the ban
    if (!requester || !["owner", "moderator"].includes(requester.role)) {
      return res
        .status(403)
        .json({ error: "Not authorized to ban participants" });
    }

    // Update the participant record to set 'isBanned' to true
    await Participant.findOneAndUpdate(
      { _id: participantId, room: roomId },
      { isBanned: true },
    );

    // Confirm that the user has been banned
    res.json({ success: true, message: "Participant banned" });
  } catch (error) {
    // Respond with error on failure
    res.status(400).json({ error: error.message });
  }
};

/**
 * Unbans a participant from a room (owner only).
 * 
 * @async
 * @function unbanParticipant
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const unbanParticipant = async (req, res) => {
  try {
    // Extract IDs from params
    const { roomId, participantId } = req.params;

    // Look up the room to verify owner status
    const room = await Room.findById(roomId).populate("owner");
    // Ensure only the room creator/owner can lift bans
    if (String(room.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ error: "Only room owner can unban" });
    }

    // Update the record to clear the banned flag
    await Participant.findOneAndUpdate(
      { _id: participantId, room: roomId },
      { isBanned: false },
    );

    // Provide confirmation
    res.json({ success: true, message: "Participant unbanned" });
  } catch (error) {
    // Return error on database failure
    res.status(400).json({ error: error.message });
  }
};

/**
 * Searches for participants within a room based on query or role.
 * 
 * @async
 * @function searchParticipants
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const searchParticipants = async (req, res) => {
  try {
    // Extracts room ID and optional query/role filters
    const { roomId } = req.params;
    const { query, role } = req.query;

    // Ensure the requester is actually present in the specified room
    await Participant.findOne({ user: req.user._id, room: roomId });

    // Build the dynamic filter object
    const filter = { room: roomId };
    // Add text search filter for usernames if provided
    if (query) {
      filter["user.username"] = { $regex: query, $options: "i" };
    }
    // Add permission role filter if provided
    if (role) {
      filter.role = role;
    }

    // Find up to 50 matching participants
    const participants = await Participant.find(filter)
      // Include basic user attributes
      .populate("user", "username email")
      .limit(50);

    // Return the result set
    res.json({ participants });
  } catch (error) {
    // Handle failures with a 400 error status
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getRoomParticipants,
  assignRole,
  kickParticipant,
  banParticipant,
  unbanParticipant,
  searchParticipants,
};

