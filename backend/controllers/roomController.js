/**
 * @fileoverview Controller for managing drawing rooms, including creation, joining, and exports.
 */

// Import the Mongoose library to handle database operations and types
const mongoose = require("mongoose");
// Import the Room model to interact with the rooms collection
const Room = require("../models/Room");
// Import the Participant model to manage room-user associations
const Participant = require("../models/Participant");
// Import the Invitation model to handle room invite requests
const Invitation = require("../models/Invitation");
// Import the User model as the base for all account-related data
const User = require("../models/User");
// Import the utility for generating short, unique alphanumeric room codes
const { generateRoomCode } = require("../utils/generateRoomCode");
// Import createCanvas from the canvas library for server-side drawing exports
const { createCanvas } = require("canvas");

/**
 * Creates a new collaborative drawing room and assigns the requester as the owner.
 * 
 * @async
 * @function createRoom
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const createRoom = async (req, res) => {
  try {
    // Destructure initial room settings from the request body
    const { name, description, visibility, password } = req.body;

    // Loop until a unique room code is generated
    let roomCode;
    let existingRoom;
    do {
      // Generate a new 4-digit code
      roomCode = generateRoomCode();
      // Check if any existing room is already using this code
      existingRoom = await Room.findOne({ roomCode });
    } while (existingRoom); // If code exists, retry

    // Initialize the new Room document with user-provided information
    const room = new Room({
      name,
      description,
      roomCode,
      visibility,
      password,
      // Assign the current user as the record owner
      owner: req.user._id,
    });

    // Save the room document to the database
    await room.save();

    // Automatically join the room creator as the first participant
    const ownerParticipant = new Participant({
      user: req.user._id,
      room: room._id,
      // Grant the creator the 'owner' role permissions
      role: "owner",
    });
    // Save the participant record
    await ownerParticipant.save();

    // Link the participant record back to the Room document's participants list
    room.participants.push(ownerParticipant._id);
    // Commit the update to the Room record
    await room.save();

    // Return success status and basic room metadata to the frontend
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
    // Handle validation or database errors with a 400 status code
    res.status(400).json({ error: error.message });
  }
};

/**
 * Allows a user to join a room using a room code and password (if private).
 * 
 * @async
 * @function joinRoom
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const joinRoom = async (req, res) => {
  try {
    // Extract room coordinates and optional password from request
    const { roomCode, password } = req.body;

    // Build a query that accepts both MongoDB ObjectId and short room codes
    let query = { isActive: true };
    if (mongoose.Types.ObjectId.isValid(roomCode)) {
      // If it looks like a valid ObjectId, check both _id and roomCode fields
      query.$or = [{ _id: roomCode }, { roomCode: roomCode }];
    } else {
      // Otherwise, treat it as a short alphanumeric room code
      query.roomCode = roomCode;
    }

    // Locate the room, ensuring it is still flagged as active
    const room = await Room.findOne(query).populate("owner", "username");

    // If the room doesn't exist or is closed, return a 404 error
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Encrypt-check password if the room is marked as private
    if (room.visibility === "private" && room.password) {
      // Use the model's comparePassword method to verify the provided string
      const isPasswordValid = await room.comparePassword(password || "");
      // If the password is wrong, deny admission
      if (!isPasswordValid) {
        return res.status(403).json({ error: "Invalid password" });
      }
    }

    // Check if the current user is already registered as a participant in this room
    const existingParticipant = await Participant.findOne({
      user: req.user._id,
      room: room._id,
    });

    // If already a member, return the existing status to avoid duplicates
    if (existingParticipant) {
      return res.status(400).json({
        error: "Already participating in this room",
        participant: existingParticipant,
      });
    }

    // Initialize a new participant record for the user in this room
    const participant = new Participant({
      user: req.user._id,
      room: room._id,
    });
    // Save the new connection to the database
    await participant.save();

    // Add the participant's unique ID to the Room's internal list
    room.participants.push(participant._id);
    // Commit the update to the Room record
    await room.save();

    // Respond with success and summarized metadata
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
    // Catch-all for unexpected database or logic failures
    res.status(400).json({ error: error.message });
  }
};

/**
 * Fetches a list of public rooms with optional search and pagination.
 * 
 * @async
 * @function getPublicRooms
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const getPublicRooms = async (req, res) => {
  try {
    // Destructure search string and pagination settings from query
    const { search, page = 1, limit = 10 } = req.query;
    // Set base filtering criteria for public, active rooms
    const query = {
      visibility: "public",
      isActive: true,
    };

    // If a search keyword is provided, apply a case-insensitive regex match to the room name
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Fetch the matching room records from the database
    const rooms = await Room.find(query)
      // Attach owner username for display
      .populate("owner", "username")
      // Cap the results according to the limit
      .limit(limit * 1)
      // Skip results based on the current page number
      .skip((page - 1) * limit)
      // Sort so that the newest rooms appear at the top
      .sort({ createdAt: -1 });

    // Count the total number of documents matching our filter for UI paging
    const total = await Room.countDocuments(query);

    // Respond with the room list and pagination meta-information
    res.json({
      success: true,
      rooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // Return a generic 400 error status if the query fails
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Fetches all rooms where the current user is a participant or owner.
 * 
 * @async
 * @function getMyRooms
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const getMyRooms = async (req, res) => {
  try {
    // Locate all participant records belonging to this user, excluding any where they are banned
    const userParticipations = await Participant.find({
      user: req.user._id,
      isBanned: { $ne: true },
    }).select("room");

    // Flatten the participation objects into an array of simple room IDs
    const participantRoomIds = userParticipations.map((p) => p.room);

    // Retrieve full room data for everything in our ID list that's still active
    const rooms = await Room.find({
      _id: { $in: participantRoomIds },
      isActive: true,
    })
      // Attach basic owner info
      .populate("owner", "username")
      // Attach the full list of participants to show who else is in the room
      .populate("participants")
      // Sort by last active/update time for dashboard relevance
      .sort({ updatedAt: -1 });

    // Respond with the curated list of the user's rooms
    res.json({ success: true, rooms });
  } catch (error) {
    // Respond with error details if the multi-step fetch fails
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Updates room details (name, description, visibility, etc.).
 * 
 * @async
 * @function updateRoom
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const updateRoom = async (req, res) => {
  try {
    // Retrieve identifiers from the request parameters and payload
    const { id } = req.params;
    const updates = req.body;

    // Verify that the room exists AND ensures that only the actual owner can modify it
    const room = await Room.findOne({
      _id: id,
      owner: req.user._id,
    });

    // If room is missing or user lacks ownership rights, refuse update
    if (!room) {
      return res
        .status(404)
        .json({ error: "Room not found or not authorized" });
    }

    // Merge the provided update fields into the existing room document
    Object.assign(room, updates);
    // Commit the changes to the database
    await room.save();

    // Confirm success and return the updated room record
    res.json({ success: true, room });
  } catch (error) {
    // Catch database errors and return a 400 status
    res.status(400).json({ error: error.message });
  }
};

/**
 * Deactivates a room (soft delete).
 * 
 * @async
 * @function deleteRoom
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const deleteRoom = async (req, res) => {
  try {
    // Get the room ID from the URL
    const { id } = req.params;

    // Locate the room for the specific owner and toggle 'isActive' to false
    const room = await Room.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      { isActive: false },
      { new: true },
    );

    // If no room found (either ID is wrong or requester is not owner), return error
    if (!room) {
      return res
        .status(404)
        .json({ error: "Room not found or not authorized" });
    }

    // Acknowledge the operation's completion
    res.json({ success: true });
  } catch (error) {
    // Return error if update operation fails
    res.status(400).json({ error: error.message });
  }
};

/**
 * Allows a participant to leave a room.
 * 
 * @async
 * @function leaveRoom
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const leaveRoom = async (req, res) => {
  try {
    // Extract room ID from parameters
    const { id } = req.params;

    // Check if the specific room even exists and is active
    const room = await Room.findOne({
      _id: id,
      isActive: true,
    });

    // If missing, return a 404
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Attempt to locate the specific user participation record for this room
    const participant = await Participant.findOne({
      user: req.user._id,
      room: room._id,
    });

    // If the user isn't actually a member, throw an error
    if (!participant) {
      return res.status(400).json({ error: "You are not in this room" });
    }

    // Safety check: protect the room from becoming ownerless
    if (participant.role === "owner") {
      return res.status(403).json({
        error: "Room owner cannot leave. Please delete the room instead.",
      });
    }

    // Atomically remove the participant's list entry from the Room document
    room.participants = room.participants.filter(
      (p) => p.toString() !== participant._id.toString()
    );
    // Commit the removal of the participant pointer
    await room.save();

    // Permanently delete the participant record from the collection
    await Participant.findByIdAndDelete(participant._id);

    // Provide confirmation to the user
    res.json({ success: true, message: "Left room successfully" });
  } catch (error) {
    // Respond with failure on logic or DB error
    res.status(400).json({ error: error.message });
  }
};

/**
 * Performs administrative actions on a participant (promote, demote, kick, ban).
 * 
 * @async
 * @function manageParticipant
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const manageParticipant = async (req, res) => {
  try {
    // Extract both room and target user IDs from the URL
    const { id: roomId, userId } = req.params;
    // Extract the action (promo/demote/kick/ban) from request body
    const { action } = req.body;

    // Fetch the membership record for the user making the request
    const requester = await Participant.findOne({
      user: req.user._id,
      room: roomId,
    });

    // If the requester isn't a member, block the admin action
    if (!requester) {
      return res.status(403).json({ error: "You are not in this room" });
    }

    // Fetch the membership record for the user being moderated
    const targetParticipant = await Participant.findOne({
      user: userId,
      room: roomId,
    });

    // If target record is missing, return error
    if (!targetParticipant) {
      return res.status(404).json({ error: "Participant not found" });
    }

    // Safety check: ensure admins can't moderate themselves
    if (String(req.user._id) === String(userId)) {
      return res.status(400).json({ error: "Cannot perform action on yourself" });
    }

    // Execute logic based on the requested administrative action
    switch (action) {
      case "promote":
        // Strict permission check: only the true owner can elevate roles
        if (requester.role !== "owner") {
          return res.status(403).json({ error: "Only room owner can promote" });
        }
        // Promotion is only valid for regular participants
        if (targetParticipant.role !== "participant") {
          return res.status(400).json({ error: "Can only promote regular participants" });
        }
        // Set the new role
        targetParticipant.role = "moderator";
        // Update the record
        await targetParticipant.save();
        // Return success message
        res.json({ success: true, message: "Participant promoted to moderator" });
        break;

      case "demote":
        // Strict permission check: only the true owner can lower roles
        if (requester.role !== "owner") {
          return res.status(403).json({ error: "Only room owner can demote" });
        }
        // Demotion is only valid for existing moderators
        if (targetParticipant.role !== "moderator") {
          return res.status(400).json({ error: "Can only demote moderators" });
        }
        // Reset the role to base participant levels
        targetParticipant.role = "participant";
        // Update the record
        await targetParticipant.save();
        // Return success message
        res.json({ success: true, message: "Moderator demoted to participant" });
        break;

      case "kick":
        // Check for permission: owners and moderators both have kick rights
        if (!["owner", "moderator"].includes(requester.role)) {
          return res.status(403).json({ error: "Not authorized to kick" });
        }
        // Hierarchy check: moderators cannot kick other moderators or the owner
        if (requester.role === "moderator" && targetParticipant.role !== "participant") {
          return res.status(403).json({ error: "Moderators can only kick participants" });
        }
        // Fetch the corresponding room document
        const room = await Room.findById(roomId);
        // Remove the target participant's ID from the room's access list
        room.participants = room.participants.filter(
          (p) => p.toString() !== targetParticipant._id.toString()
        );
        // Save the updated list
        await room.save();
        // Permanently delete the specific participant record
        await Participant.findByIdAndDelete(targetParticipant._id);
        // Provide confirmation
        res.json({ success: true, message: "Participant kicked" });
        break;

      case "ban":
        // Check for permission: both owners and moderators can ban users
        if (!["owner", "moderator"].includes(requester.role)) {
          return res.status(403).json({ error: "Not authorized to ban" });
        }
        // Hierarchy check: prevents moderators from banning equal or higher ranking roles
        if (requester.role === "moderator" && targetParticipant.role !== "participant") {
          return res.status(403).json({ error: "Moderators can only ban participants" });
        }
        // Flag the user as banned to prevent re-admission
        targetParticipant.isBanned = true;
        // Save the updated status
        await targetParticipant.save();
        // Provide confirmation
        res.json({ success: true, message: "Participant banned" });
        break;

      default:
        // Handle malformed requests with unknown actions
        res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    // Catch-all for failed queries or logic errors
    res.status(400).json({ error: error.message });
  }
};

/**
 * Validates existence and access rights for a specific room.
 * 
 * @async
 * @function validateRoom
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const validateRoom = async (req, res) => {
  try {
    // Extract the identifier (could be a MongoDB ID or a short room code)
    const { id } = req.params;

    // Build the initial filter to only look for rooms that are active
    let query = { isActive: true };

    // If the provided ID is a valid hex MongoDB ID, check both _id and roomCode fields
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { roomCode: id }];
    } else {
      // Otherwise, assume it's a short alphanumeric room code
      query.roomCode = id;
    }

    // Attempt to locate the room and populate the owner's username
    const room = await Room.findOne(query).populate("owner", "username");

    // If no room is found, return a 404 error
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Check if the current user is recorded as a participant in this room
    const isParticipant = await Participant.findOne({
      user: req.user._id,
      room: room._id,
    });

    // Check specifically if the current user has been flagged as banned from this room
    const isBanned = await Participant.findOne({
      user: req.user._id,
      room: room._id,
      isBanned: true,
    });

    // If a ban record exists, deny access with a 403 status
    if (isBanned) {
      return res.status(403).json({ error: "You have been banned from this room" });
    }

    // Return success and a sanitized object of room metadata for the frontend
    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        roomCode: room.roomCode,
        visibility: room.visibility,
        // Helper flag to trigger password prompt on the client
        requiresPassword: room.visibility === "private" && !!room.password,
        owner: room.owner?.username,
        participantCount: room.participants.length,
        // Helper flag to show 'Go to Canvas' vs 'Join Room' buttons
        isAlreadyMember: !!isParticipant,
      },
    });
  } catch (error) {
    // Catch invalid IDs or other database failures
    res.status(400).json({ error: error.message });
  }
};

/**
 * Invites multiple users to a room.
 * 
 * @async
 * @function inviteUsers
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const inviteUsers = async (req, res) => {
  try {
    // Extract room ID from URL and user IDs list from body
    const { id: roomId } = req.params;
    const { userIds } = req.body;

    // Ensure the payload actually contains an array of users
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No users provided for invitation"
      });
    }

    // Verify the room exists and is currently open
    const room = await Room.findOne({
      _id: roomId,
      isActive: true,
    });

    // If room is missing, return error
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Retrieve the membership context for the user sending the invites
    const requester = await Participant.findOne({
      user: req.user._id,
      room: roomId,
    });

    // Only owners or moderators are permitted to send invites
    if (!requester || !["owner", "moderator"].includes(requester.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to invite users to this room",
      });
    }

    // Verify that all invited user IDs correspond to actual registered accounts
    const invitedUsers = await User.find({
      _id: { $in: userIds },
    });

    // If any IDs are invalid, throw an error
    if (invitedUsers.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more users not found",
      });
    }

    // Prepare arrays and counters for the batch invitation operation
    const invitations = [];
    const results = { sent: 0, skipped: 0, errors: [] };

    // Process each target user ID
    for (const userId of userIds) {
      try {
        // Skip users that are already members of the room
        const existingParticipant = await Participant.findOne({
          user: userId,
          room: roomId,
        });

        if (existingParticipant) {
          results.skipped++;
          continue;
        }

        // Skip users that already have a pending invitation for this room
        const existingInvitation = await Invitation.findOne({
          room: roomId,
          invitedUser: userId,
          status: "pending",
        });

        if (existingInvitation) {
          results.skipped++;
          continue;
        }

        // Initialize a new invitation record
        const invitation = new Invitation({
          room: roomId,
          invitedUser: userId,
          invitedBy: req.user._id,
          // Flag as true to trigger downstream notification logic
          emailSent: true, 
        });

        // Save invitation record
        await invitation.save();
        // Add to our results list
        invitations.push(invitation);
        // Increment success counter
        results.sent++;
      } catch (error) {
        // Log individual errors within the loop to prevent one failure from stopping the whole batch
        results.errors.push({ userId, error: error.message });
      }
    }

    // Return the batch operation summary to the client
    res.json({
      success: true,
      message: `Invitations sent to ${results.sent} user(s)`,
      results,
      invitations,
    });
  } catch (error) {
    // Handle top-level validation failures
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Renders the room's drawing data onto a canvas and exports it as an image.
 * 
 * @async
 * @function exportDrawing
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
const exportDrawing = async (req, res) => {
  try {
    // Extract room ID from parameters and format from query string
    const { id: roomId } = req.params;
    const { format = "png" } = req.query;

    // Locate the active room by its ID
    const room = await Room.findOne({
      _id: roomId,
      isActive: true,
    });

    // If the room doesn't exist, return a 404
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Check if the current user is a participant in the room
    const participant = await Participant.findOne({
      user: req.user._id,
      room: roomId,
    });

    // If not a participant, deny access to the drawing export
    if (!participant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this room",
      });
    }

    // Set standard canvas dimensions for the export
    const width = 1280;
    const height = 720;
    // Create a new canvas instance for server-side rendering
    const canvas = createCanvas(width, height);
    // Get the primary rendering context
    const ctx = canvas.getContext("2d");

    // Initialize the canvas with a solid white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Helper logic to render serialized drawing elements onto the canvas
    const renderElement = (element) => {
      // Set transparency according to the element's opacity property
      ctx.globalAlpha = element.opacity ?? 1;

      // Handle different drawing primitives (pencil, line, etc.)
      switch (element.type) {
        case "pencil":
        case "line":
          // Render freehand or straight paths
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
          // Simulate eraser by clearing rectangular patches along the path
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
          // Render a simple bounding box
          ctx.strokeStyle = element.color;
          ctx.lineWidth = element.strokeWidth;
          ctx.strokeRect(element.x, element.y, element.width, element.height);
          break;

        case "circle":
          // Render a circular path
          ctx.strokeStyle = element.color;
          ctx.lineWidth = element.strokeWidth;
          // Calculate radius from width/height dimensions
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
          // Draw a line with a custom arrowhead at the termination point
          if (element.points && element.points.length >= 2) {
            ctx.strokeStyle = element.color;
            ctx.lineWidth = element.strokeWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            const start = element.points[0];
            const end = element.points[element.points.length - 1];

            // Draw primary line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Calculate arrow angle relative to path direction
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            // Define arrowhead size relative to stroke weight
            const arrowSize = element.strokeWidth * 3;

            // Draw the two segments of the arrowhead
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
          // Render text with dynamic sizing
          ctx.fillStyle = element.color;
          ctx.font = `${element.strokeWidth * 4}px Arial`;
          ctx.fillText(element.text || "Text", element.x, element.y);
          break;
      }

      // Reset transparency for the next element
      ctx.globalAlpha = 1;
    };

    // Sequentially render each drawing element in the room's history
    if (room.drawingData && Array.isArray(room.drawingData)) {
      for (const element of room.drawingData) {
        try {
          renderElement(element);
        } catch (err) {
          // Log individual rendering failures to avoid breaking the entire export
          console.error("Error rendering element:", err);
        }
      }
    }

    // Prepare for image output buffer generation
    let buffer;
    // Construct a safe filename based on room name and timestamp
    const filename = `${room.name.replace(/\s+/g, "_")}_${Date.now()}`;

    // Handle JPEG requests if explicitly asked
    if (format === "jpeg" || format === "jpg") {
      buffer = canvas.toBuffer("image/jpeg", { quality: 0.95 });
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.jpg"`);
    } else {
      // Default fallback is high-quality PNG
      buffer = canvas.toBuffer("image/png");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.png"`);
    }

    // Stream the buffer content as the response body
    res.send(buffer);
  } catch (error) {
    // Return a 500 error if canvas rendering or database access fails
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
