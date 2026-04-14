const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getMyReferral,
  getWallet,
  validateReferralCode,
  adminGetReferralStats,
} = require("../controllers/referralController");

// User routes
router.get("/my-referral", protect, getMyReferral);
router.get("/wallet", protect, getWallet);
router.post("/validate", validateReferralCode); // public — check before signup

// Admin routes
router.get("/admin/stats", protect, authorize("admin"), adminGetReferralStats);

module.exports = router;
