const Participant = require("../models/Participant");
const Room = require("../models/Room");
const User = require("../models/User");

// Get all participants in a room
const getRoomParticipants = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Verify user is in the room
    const userParticipant = await Participant.findOne({
      user: req.user._id,
      room: roomId,
    });

    if (!userParticipant) {
      return res.status(403).json({ error: "Not authorized for this room" });
    }

    const participants = await Participant.find({ room: roomId })
      .populate("user", "username email")
      .sort({ joinedAt: -1 });

    res.json({
      participants,
      count: participants.length,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Assign role to participant (owner only)
const assignRole = async (req, res) => {
  try {
    const { roomId, participantId } = req.params;
    const { role } = req.body; // 'moderator' or 'participant'

    // Verify requester is room owner
    const room = await Room.findById(roomId).populate("owner");
    if (!room || String(room.owner._id) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only room owner can assign roles" });
    }

    const participant = await Participant.findOneAndUpdate(
      { _id: participantId, room: roomId },
      { role },
      { new: true },
    ).populate("user", "username");

    res.json({
      success: true,
      participant: {
        id: participant._id,
        user: participant.user.username,
        role: participant.role,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Kick participant from room
const kickParticipant = async (req, res) => {
  try {
    const { roomId, participantId } = req.params;

    // Check if requester has permission
    const requester = await Participant.findOne({
      user: req.user._id,
      room: roomId,
    });

    if (!requester || !["owner", "moderator"].includes(requester.role)) {
      return res
        .status(403)
        .json({ error: "Not authorized to kick participants" });
    }

    // Can't kick owner
    const targetParticipant = await Participant.findById(participantId);
    if (
      !targetParticipant ||
      String(targetParticipant.user) === String(req.user._id)
    ) {
      return res.status(400).json({ error: "Cannot kick room owner" });
    }

    // Remove from room participants list
    await Room.findByIdAndUpdate(roomId, {
      $pull: { participants: participantId },
    });

    await Participant.findByIdAndDelete(participantId);

    res.json({ success: true, message: "Participant kicked successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Ban participant
const banParticipant = async (req, res) => {
  try {
    const { roomId, participantId } = req.params;

    const requester = await Participant.findOne({
      user: req.user._id,
      room: roomId,
    });

    if (!requester || !["owner", "moderator"].includes(requester.role)) {
      return res
        .status(403)
        .json({ error: "Not authorized to ban participants" });
    }

    await Participant.findOneAndUpdate(
      { _id: participantId, room: roomId },
      { isBanned: true },
    );

    res.json({ success: true, message: "Participant banned" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Unban participant
const unbanParticipant = async (req, res) => {
  try {
    const { roomId, participantId } = req.params;

    const room = await Room.findById(roomId).populate("owner");
    if (String(room.owner._id) !== String(req.user._id)) {
      return res.status(403).json({ error: "Only room owner can unban" });
    }

    await Participant.findOneAndUpdate(
      { _id: participantId, room: roomId },
      { isBanned: false },
    );

    res.json({ success: true, message: "Participant unbanned" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Search participants
const searchParticipants = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { query, role } = req.query;

    // Verify user is in room
    await Participant.findOne({ user: req.user._id, room: roomId });

    const filter = { room: roomId };
    if (query) {
      filter["user.username"] = { $regex: query, $options: "i" };
    }
    if (role) {
      filter.role = role;
    }

    const participants = await Participant.find(filter)
      .populate("user", "username email")
      .limit(50);

    res.json({ participants });
  } catch (error) {
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
