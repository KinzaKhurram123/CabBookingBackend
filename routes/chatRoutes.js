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
  sendDeliveryMessage,
  getDeliveryMessages,
  markDeliveryMessagesAsRead,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");
router.get("/debug/messages/:rideId", protect, debugMessages);

router.get("/test", testChat);

router.get("/debug/ride/:rideId", protect, debugRideAccess);

router.use(protect);

// Ride chat
router.post("/send", sendMessage);
router.get("/messages/:rideId", getMessages);
router.put("/read/:rideId", markMessagesAsRead);
router.delete("/message/:messageId", deleteMessage);
router.post("/pusher/auth", authenticatePusher);

// Parcel & Pet delivery chat
// POST   /api/chat/delivery/send          — message bhejo
// GET    /api/chat/delivery/:bookingId    — messages lo (?bookingType=parcel or pet)
// PUT    /api/chat/delivery/read/:bookingId — read mark karo (?bookingType=parcel or pet)
router.post("/delivery/send", sendDeliveryMessage);
router.get("/delivery/:bookingId", getDeliveryMessages);
router.put("/delivery/read/:bookingId", markDeliveryMessagesAsRead);

console.log("✅ Chat routes loaded successfully");

module.exports = router;
