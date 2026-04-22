const express = require("express");
const { getUserProfile, getCurrentActiveBooking } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profile", protect, getUserProfile);
router.get("/current-active-booking", protect, getCurrentActiveBooking);

module.exports = router;
