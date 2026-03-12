const express = require("express");
const router = express.Router();
const { createRideBooking } = require("../controllers/rideBookingController");
const protect = require("../middleware/authMiddleware");

router.post("/ridebook", protect, createRideBooking);

module.exports = router;
