const express = require("express");
const router = express.Router();
const {
  createRideBooking,
  getNearbyRides,
  getAllRides,
  debugNearbyRides,
  testRideStructure,
  getAllRidesForDriver,
  cancelRideBooking,
  driverCancelRideBooking,
  adminCancelRideBooking,
  getCancelledBookings,
  getUserRideHistory,
} = require("../controllers/rideBookingController");
const protect = require("../middleware/authMiddleware");
const RideBooking = require("../models/rideBooking");

router.post("/ridebook", protect, createRideBooking);
router.get("/nearby", protect, getNearbyRides);
router.get("/all_rides", getAllRides);
router.get("/ride_history/:userId", getUserRideHistory);
router.get("/all_rides_status", protect, getAllRidesForDriver);
router.put("/bookings/:bookingId/cancel", protect, cancelRideBooking);

router.put(
  "/driver/bookings/:bookingId/cancel",
  protect,
  driverCancelRideBooking,
);
router.put(
  "/admin/bookings/:bookingId/cancel",
  protect,
  adminCancelRideBooking,
);
router.get("/bookings/cancelled", getCancelledBookings);

module.exports = router;
