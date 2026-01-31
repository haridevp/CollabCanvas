const express = require("express");
const auth = require("./auth");
const {
  getRoomParticipants,
  assignRole,
  kickParticipant,
  banParticipant,
  unbanParticipant,
  searchParticipants,
} = require("../controllers/participantController");

const router = express.Router();

// Get all participants in a room (room owner/moderator only)
router.get("/room/:roomId", auth, getRoomParticipants);

// Assign role to participant (owner only)
router.put("/:roomId/:participantId/role", auth, assignRole);

// Kick participant from room (moderator/owner)
router.post("/:roomId/:participantId/kick", auth, kickParticipant);

// Ban participant (owner/moderator)
router.post("/:roomId/:participantId/ban", auth, banParticipant);

// Unban participant (owner only)
router.post("/:roomId/:participantId/unban", auth, unbanParticipant);

// Search/filter participants in room
router.get("/room/:roomId/search", auth, searchParticipants);

module.exports = router;
