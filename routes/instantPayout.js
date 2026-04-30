const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { riderProtect } = require("../middleware/riderAuthMiddleware");
const {
  requestInstantPayout,
  getInstantPayoutFee,
  checkInstantPayoutEligibility,
  getWalletBalance,
} = require("../controllers/instantPayoutController");

// @route   POST /api/instant-payout/request
// @desc    Request instant payout
// @access  Private (Rider only)
router.post("/request", protect, riderProtect, requestInstantPayout);

// @route   GET /api/instant-payout/fee
// @desc    Get instant payout fee preview
// @access  Private (Rider only)
router.get("/fee", protect, riderProtect, getInstantPayoutFee);

// @route   GET /api/instant-payout/eligibility
// @desc    Check instant payout eligibility
// @access  Private (Rider only)
router.get("/eligibility", protect, riderProtect, checkInstantPayoutEligibility);

// @route   GET /api/instant-payout/balance
// @desc    Get rider wallet balance
// @access  Private (Rider only)
router.get("/balance", protect, riderProtect, getWalletBalance);

module.exports = router;
