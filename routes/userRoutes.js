const express = require("express");
const { getUserProfile, getCurrentActiveBooking, updateFCMToken, requestAccountDeletion, cancelAccountDeletion, publicAccountDeletion } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profile", protect, getUserProfile);
router.get("/current-active-booking", protect, getCurrentActiveBooking);
router.post("/fcm-token", protect, updateFCMToken);

// Account deletion (requires login token)
router.delete("/account", protect, requestAccountDeletion);
router.post("/account/restore", protect, cancelAccountDeletion);

// Public account deletion (no token — for website/Google Play Store)
router.post("/delete-account-public", publicAccountDeletion);

module.exports = router;
