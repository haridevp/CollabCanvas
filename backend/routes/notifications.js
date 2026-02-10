const express = require("express");
const {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");
const auth = require("../middleware/authh");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/", auth, asyncHandler(getNotifications));
router.get("/unread/count", auth, asyncHandler(getUnreadCount));
router.post("/:id/read", auth, asyncHandler(markNotificationAsRead));
router.post("/mark-all-read", auth, asyncHandler(markAllAsRead));
router.delete("/:id", auth, asyncHandler(deleteNotification));

module.exports = router;
