const express = require("express");
const { getUserProfile } = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");
const {
  getProfile,
  uploadProfileImage,
} = require("../controllers/authController");

const router = express.Router();

router.get("/profile", protect, getUserProfile);
// router.get("/profile/image", uploadProfileImage);

module.exports = router;
