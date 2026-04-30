const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createEnhancedRideBooking,
  updateWaypoints,
  trackWaypointEvent,
  cancelScheduledRide,
} = require("../controllers/enhancedRideBookingController");

// @route   POST /api/rides/enhanced/book
// @desc    Create ride booking with scheduling and waypoints support
// @access  Private
router.post("/book", protect, createEnhancedRideBooking);

// @route   PUT /api/rides/enhanced/:bookingId/waypoints
// @desc    Update waypoints (before driver acceptance)
// @access  Private
router.put("/:bookingId/waypoints", protect, updateWaypoints);

// @route   POST /api/rides/enhanced/:bookingId/waypoints/:waypointIndex/track
// @desc    Track waypoint arrival/departure
// @access  Private
router.post("/:bookingId/waypoints/:waypointIndex/track", protect, trackWaypointEvent);

// @route   POST /api/rides/enhanced/:bookingId/cancel
// @desc    Cancel scheduled ride
// @access  Private
router.post("/:bookingId/cancel", protect, cancelScheduledRide);

module.exports = router;
