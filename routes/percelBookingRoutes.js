const express = require("express");
const router = express.Router();
const {
  createParcelBooking,
  getParcelBookingById,
  cancelParcelBooking,
} = require("../controllers/parcelBookingController");
const { protect } = require("../middleware/authMiddleware");

router.post("/create", protect, createParcelBooking);
router.put("/cancel/:id", protect, cancelParcelBooking);
router.get("/:id", protect, getParcelBookingById);

module.exports = router;
