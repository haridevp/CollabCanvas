const Room = require("../models/Room");
const Participant = require("../models/Participant");
const Invitation = require("../models/Invitation");
const User = require("../models/User");
const { generateRoomCode } = require("../utils/generateRoomCode");
const { createCanvas } = require("canvas");

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

const exportDrawing = async (req, res) => {
  try {
    const { id: roomId } = req.params;
    const { format = "png" } = req.query;

    // Validate room exists and user is a participant
    const room = await Room.findOne({
      _id: roomId,
      isActive: true,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Verify user is a participant
    const participant = await Participant.findOne({
      user: req.user._id,
      room: roomId,
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this room",
      });
    }

    // Create canvas with reasonable dimensions
    const width = 1280;
    const height = 720;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Fill with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Helper function to render drawing elements
    const renderElement = (element) => {
      ctx.globalAlpha = element.opacity ?? 1;

      switch (element.type) {
        case "pencil":
        case "line":
          if (element.points && element.points.length > 0) {
            ctx.strokeStyle = element.color;
            ctx.lineWidth = element.strokeWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            ctx.beginPath();
            ctx.moveTo(element.points[0].x, element.points[0].y);
            for (let i = 1; i < element.points.length; i++) {
              ctx.lineTo(element.points[i].x, element.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case "eraser":
          if (element.points && element.points.length > 0) {
            ctx.clearRect(
              element.points[0].x - element.strokeWidth / 2,
              element.points[0].y - element.strokeWidth / 2,
              element.strokeWidth,
              element.strokeWidth
            );

            for (let i = 1; i < element.points.length; i++) {
              ctx.clearRect(
                element.points[i].x - element.strokeWidth / 2,
                element.points[i].y - element.strokeWidth / 2,
                element.strokeWidth,
                element.strokeWidth
              );
            }
          }
          break;

        case "rectangle":
          ctx.strokeStyle = element.color;
          ctx.lineWidth = element.strokeWidth;
          ctx.strokeRect(element.x, element.y, element.width, element.height);
          break;

        case "circle":
          ctx.strokeStyle = element.color;
          ctx.lineWidth = element.strokeWidth;
          const radius = Math.sqrt(
            Math.pow(element.width / 2, 2) + Math.pow(element.height / 2, 2)
          );
          ctx.beginPath();
          ctx.arc(
            element.x + element.width / 2,
            element.y + element.height / 2,
            radius,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          break;

        case "arrow":
          if (element.points && element.points.length >= 2) {
            ctx.strokeStyle = element.color;
            ctx.lineWidth = element.strokeWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            const start = element.points[0];
            const end = element.points[element.points.length - 1];

            // Draw line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Draw arrowhead
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const arrowSize = element.strokeWidth * 3;

            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - arrowSize * Math.cos(angle - Math.PI / 6),
              end.y - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - arrowSize * Math.cos(angle + Math.PI / 6),
              end.y - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
          break;

        case "text":
          ctx.fillStyle = element.color;
          ctx.font = `${element.strokeWidth * 4}px Arial`;
          ctx.fillText(element.text || "Text", element.x, element.y);
          break;
      }

      ctx.globalAlpha = 1;
    };

    // Render all drawing elements
    if (room.drawingData && Array.isArray(room.drawingData)) {
      for (const element of room.drawingData) {
        try {
          renderElement(element);
        } catch (err) {
          console.error("Error rendering element:", err);
          // Continue rendering other elements
        }
      }
    }

    // Generate image data based on format
    let buffer;
    const filename = `${room.name.replace(/\s+/g, "_")}_${Date.now()}`;

    if (format === "jpeg" || format === "jpg") {
      buffer = canvas.toBuffer("image/jpeg", { quality: 0.95 });
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.jpg"`);
    } else {
      // Default to PNG
      buffer = canvas.toBuffer("image/png");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.png"`);
    }

    res.send(buffer);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export drawing",
      error: error.message,
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
  exportDrawing,
};
