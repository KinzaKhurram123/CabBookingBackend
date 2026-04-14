const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { riderProtect } = require("../middleware/riderAuthMiddleware");
const {
  getWallet,
  requestWithdrawal,
  getWithdrawalHistory,
  updateBankAccount,
  adminGetWithdrawals,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
  adminMarkAsPaid,
} = require("../controllers/withdrawalController");

// ─── Driver routes ────────────────────────────────────────────────────────────
router.get("/wallet", protect, riderProtect, getWallet);
router.post("/request", protect, riderProtect, requestWithdrawal);
router.get("/history", protect, riderProtect, getWithdrawalHistory);
router.put("/bank-account", protect, riderProtect, updateBankAccount);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get("/admin/all", protect, authorize("admin"), adminGetWithdrawals);
router.put("/admin/approve/:withdrawalId", protect, authorize("admin"), adminApproveWithdrawal);
router.put("/admin/reject/:withdrawalId", protect, authorize("admin"), adminRejectWithdrawal);
router.put("/admin/mark-paid/:withdrawalId", protect, authorize("admin"), adminMarkAsPaid);

module.exports = router;
