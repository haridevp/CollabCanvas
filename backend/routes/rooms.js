const express = require("express");
const {
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
} = require("../controllers/roomController");
const auth = require("../middleware/authh");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.post("/create", auth, asyncHandler(createRoom));
router.post("/join", auth, asyncHandler(joinRoom));
router.get("/public", asyncHandler(getPublicRooms));
router.get("/my-rooms", auth, asyncHandler(getMyRooms));
router.get("/:id/validate", auth, asyncHandler(validateRoom));
router.get("/:id/export", auth, asyncHandler(exportDrawing));
router.post("/:id/leave", auth, asyncHandler(leaveRoom));
router.post("/:id/invite", auth, asyncHandler(inviteUsers));
router.post("/:id/participants/:userId", auth, asyncHandler(manageParticipant));
router.put("/:id", auth, asyncHandler(updateRoom));
router.delete("/:id", auth, asyncHandler(deleteRoom));

module.exports = router;
