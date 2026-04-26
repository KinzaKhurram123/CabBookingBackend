const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { protectAdmin } = require("../middleware/adminMiddleware");
const {
  validatePromoCode,
  createPromoCode,
  getAllPromoCodes,
  updatePromoCode,
  deletePromoCode,
  togglePromoStatus,
} = require("../controllers/promoController");

// User routes
router.post("/validate", protect, validatePromoCode);

// Admin routes
router.get("/", protectAdmin, getAllPromoCodes);
router.post("/", protectAdmin, createPromoCode);
router.put("/:id", protectAdmin, updatePromoCode);
router.delete("/:id", protectAdmin, deletePromoCode);
router.patch("/:id/toggle", protectAdmin, togglePromoStatus);

module.exports = router;
