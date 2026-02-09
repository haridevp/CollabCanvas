const express = require("express");
const {
  createRoom,
  joinRoom,
  getPublicRooms,
  getMyRooms,
  updateRoom,
  deleteRoom,
  leaveRoom,
  validateRoom,
} = require("../controllers/roomController");
const auth = require("../middleware/authh");

const router = express.Router();

router.post("/create", auth, createRoom);
router.post("/join", auth, joinRoom);
router.get("/public", getPublicRooms);
router.get("/my-rooms", auth, getMyRooms);
router.get("/:id/validate", auth, validateRoom);
router.post("/:id/leave", auth, leaveRoom);
router.put("/:id", auth, updateRoom);
router.delete("/:id", auth, deleteRoom);

module.exports = router;
