const Room = require("../models/Room");
const Participant = require("../models/Participant");
const Invitation = require("../models/Invitation");
const User = require("../models/User");
const { generateRoomCode } = require("../utils/generateRoomCode");

const createRoom = async (req, res) => {
  try {
    const { name, description, visibility, password } = req.body;

    // Generate unique room code
    let roomCode;
    let existingRoom;
    do {
      roomCode = generateRoomCode();
      existingRoom = await Room.findOne({ roomCode });
    } while (existingRoom);

    const room = new Room({
      name,
      description,
      roomCode,
      visibility,
      password,
      owner: req.user._id,
    });

    await room.save();

    // Auto-join owner as participant
    const ownerParticipant = new Participant({
      user: req.user._id,
      room: room._id,
      role: "owner",
    });
    await ownerParticipant.save();

    room.participants.push(ownerParticipant._id);
    await room.save();

    res.status(201).json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        roomCode: room.roomCode,
        visibility: room.visibility,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const joinRoom = async (req, res) => {
  try {
    const { roomCode, password } = req.body;

    const room = await Room.findOne({
      roomCode,
      isActive: true,
    }).populate("owner", "username");

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Check password for private rooms
    if (room.visibility === "private" && room.password) {
      const isPasswordValid = await room.comparePassword(password || "");
      if (!isPasswordValid) {
        return res.status(403).json({ error: "Invalid password" });
      }
    }

    // Check if user is already a participant
    const existingParticipant = await Participant.findOne({
      user: req.user._id,
      room: room._id,
    });

    if (existingParticipant) {
      return res.status(400).json({
        error: "Already participating in this room",
        participant: existingParticipant,
      });
    }

    // Create new participant
    const participant = new Participant({
      user: req.user._id,
      room: room._id,
    });
    await participant.save();

    room.participants.push(participant._id);
    await room.save();

    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        roomCode: room.roomCode,
      },
      participant: {
        id: participant._id,
        role: participant.role,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getPublicRooms = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const query = {
      visibility: "public",
      isActive: true,
    };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const rooms = await Room.find(query)
      .populate("owner", "username")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Room.countDocuments(query);

    res.json({
      rooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      owner: req.user._id,
      isActive: true,
    })
      .populate("participants")
      .sort({ updatedAt: -1 });

    res.json({ rooms });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const room = await Room.findOne({
      _id: id,
      owner: req.user._id,
    });

    if (!room) {
      return res
        .status(404)
        .json({ error: "Room not found or not authorized" });
    }

    Object.assign(room, updates);
    await room.save();

    res.json({ success: true, room });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      { isActive: false },
      { new: true },
    );

    if (!room) {
      return res
        .status(404)
        .json({ error: "Room not found or not authorized" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const leaveRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findOne({
      _id: id,
      isActive: true,
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Find the participant record for the current user
    const participant = await Participant.findOne({
      user: req.user._id,
      room: room._id,
    });

    if (!participant) {
      return res.status(400).json({ error: "You are not in this room" });
    }

    // Check if user is the owner - owner cannot leave
    if (participant.role === "owner") {
      return res.status(403).json({
        error: "Room owner cannot leave. Please delete the room instead.",
      });
    }

    // Remove participant from room's participants array
    room.participants = room.participants.filter(
      (p) => p.toString() !== participant._id.toString()
    );
    await room.save();

    // Delete the participant record
    await Participant.findByIdAndDelete(participant._id);

    res.json({ success: true, message: "Left room successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const manageParticipant = async (req, res) => {
  try {
    const { id: roomId, userId } = req.params;
    const { action } = req.body;

    // Verify requester is in room and has permission
    const requester = await Participant.findOne({
      user: req.user._id,
      room: roomId,
    });

    if (!requester) {
      return res.status(403).json({ error: "You are not in this room" });
    }

    // Find target participant
    const targetParticipant = await Participant.findOne({
      user: userId,
      room: roomId,
    });

    if (!targetParticipant) {
      return res.status(404).json({ error: "Participant not found" });
    }

    // Prevent self-actions
    if (String(req.user._id) === String(userId)) {
      return res.status(400).json({ error: "Cannot perform action on yourself" });
    }

    switch (action) {
      case "promote":
        // Only owner can promote
        if (requester.role !== "owner") {
          return res.status(403).json({ error: "Only room owner can promote" });
        }
        // Can only promote participants, not moderators
        if (targetParticipant.role !== "participant") {
          return res.status(400).json({ error: "Can only promote regular participants" });
        }
        targetParticipant.role = "moderator";
        await targetParticipant.save();
        res.json({ success: true, message: "Participant promoted to moderator" });
        break;

      case "demote":
        // Only owner can demote
        if (requester.role !== "owner") {
          return res.status(403).json({ error: "Only room owner can demote" });
        }
        // Can only demote moderators
        if (targetParticipant.role !== "moderator") {
          return res.status(400).json({ error: "Can only demote moderators" });
        }
        targetParticipant.role = "participant";
        await targetParticipant.save();
        res.json({ success: true, message: "Moderator demoted to participant" });
        break;

      case "kick":
        // Owner and moderators can kick
        if (!["owner", "moderator"].includes(requester.role)) {
          return res.status(403).json({ error: "Not authorized to kick" });
        }
        // Moderators can only kick participants
        if (requester.role === "moderator" && targetParticipant.role !== "participant") {
          return res.status(403).json({ error: "Moderators can only kick participants" });
        }
        // Remove from room
        const room = await Room.findById(roomId);
        room.participants = room.participants.filter(
          (p) => p.toString() !== targetParticipant._id.toString()
        );
        await room.save();
        await Participant.findByIdAndDelete(targetParticipant._id);
        res.json({ success: true, message: "Participant kicked" });
        break;

      case "ban":
        // Owner and moderators can ban
        if (!["owner", "moderator"].includes(requester.role)) {
          return res.status(403).json({ error: "Not authorized to ban" });
        }
        // Moderators can only ban participants
        if (requester.role === "moderator" && targetParticipant.role !== "participant") {
          return res.status(403).json({ error: "Moderators can only ban participants" });
        }
        targetParticipant.isBanned = true;
        await targetParticipant.save();
        res.json({ success: true, message: "Participant banned" });
        break;

      default:
        res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const validateRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findOne({
      _id: id,
      isActive: true,
    }).populate("owner", "username");

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Check if user is already a participant
    const isParticipant = await Participant.findOne({
      user: req.user._id,
      room: room._id,
    });

    // Check if user is banned
    const isBanned = await Participant.findOne({
      user: req.user._id,
      room: room._id,
      isBanned: true,
    });

    if (isBanned) {
      return res.status(403).json({ error: "You have been banned from this room" });
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        visibility: room.visibility,
        requiresPassword: room.visibility === "private" && !!room.password,
        owner: room.owner?.username,
        participantCount: room.participants.length,
        isAlreadyMember: !!isParticipant,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const inviteUsers = async (req, res) => {
  try {
    const { id: roomId } = req.params;
    const { userIds } = req.body;

    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No users provided for invitation"
      });
    }

    // Get room and verify requester is owner/moderator
    const room = await Room.findOne({
      _id: roomId,
      isActive: true,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check if requester is room owner or moderator
    const requester = await Participant.findOne({
      user: req.user._id,
      room: roomId,
    });

    if (!requester || !["owner", "moderator"].includes(requester.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to invite users to this room",
      });
    }

    // Get invited users to validate they exist
    const invitedUsers = await User.find({
      _id: { $in: userIds },
    });

    if (invitedUsers.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more users not found",
      });
    }

    // Create invitations
    const invitations = [];
    const results = { sent: 0, skipped: 0, errors: [] };

    for (const userId of userIds) {
      try {
        // Check if user is already a participant
        const existingParticipant = await Participant.findOne({
          user: userId,
          room: roomId,
        });

        if (existingParticipant) {
          results.skipped++;
          continue;
        }

        // Check if invitation already exists
        const existingInvitation = await Invitation.findOne({
          room: roomId,
          invitedUser: userId,
          status: "pending",
        });

        if (existingInvitation) {
          results.skipped++;
          continue;
        }

        // Create new invitation
        const invitation = new Invitation({
          room: roomId,
          invitedUser: userId,
          invitedBy: req.user._id,
          emailSent: true, // Assume email will be sent
        });

        await invitation.save();
        invitations.push(invitation);
        results.sent++;
      } catch (error) {
        results.errors.push({ userId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Invitations sent to ${results.sent} user(s)`,
      results,
      invitations,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  getPublicRooms,
  getMyRooms,
  updateRoom,
  deleteRoom,
  leaveRoom,
  manageParticipant,
  validateRoom,
  inviteUsers,
};
