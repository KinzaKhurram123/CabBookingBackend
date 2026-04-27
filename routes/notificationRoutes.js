const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  sendTestNotification,
  registerFCMToken,
  removeFCMToken,
  updateNotificationSettings,
} = require("../controllers/notificationCenter");

router.get("/", protect, getMyNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.get("/test", protect, sendTestNotification); // GET method for easy browser testing
router.post("/test", protect, sendTestNotification); // POST method (original)
router.post("/fcm-token", protect, registerFCMToken); // Register FCM token
router.delete("/fcm-token", protect, removeFCMToken); // Remove FCM token
router.put("/settings", protect, updateNotificationSettings); // Update notification settings
router.put("/:id/read", protect, markAsRead);
router.put("/read-all", protect, markAllAsRead);
router.delete("/:id", protect, deleteNotification);
router.delete("/", protect, deleteAllNotifications);

module.exports = router;
