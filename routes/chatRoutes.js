// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
  authenticatePusher,
  testChat,
  debugRideAccess,
  debugMessages,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");
router.get("/debug/messages/:rideId", protect, debugMessages);

router.get("/test", testChat);

router.get("/debug/ride/:rideId", protect, debugRideAccess);

router.use(protect);

router.post("/send", sendMessage);
router.get("/messages/:rideId", getMessages);
router.put("/read/:rideId", markMessagesAsRead);
router.delete("/message/:messageId", deleteMessage);
router.post("/pusher/auth", authenticatePusher);

console.log("✅ Chat routes loaded successfully");

module.exports = router;
