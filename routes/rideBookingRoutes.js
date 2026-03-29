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
  acceptRide,
  riderOnTheWay,
  reachedPickup,
  startRide,
  completeRide,
  getRideStatus,
} = require("../controllers/rideBookingController");
const { protect, authorize } = require("../middleware/authMiddleware");

const RideBooking = require("../models/rideBooking");
const {
  setupPaymentMethod,
  getUserCards,
  setDefaultCard,
  removeCard,
  getPaymentStatus,
} = require("../controllers/paymentController");

router.post("/ridebook", protect, createRideBooking);
router.get("/nearby", getNearbyRides);
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

// Driver Ride status Routes

router.put("/:bookingId/accept", protect, authorize("driver"), acceptRide);
router.put(
  "/:bookingId/on-the-way",
  protect,
  authorize("driver"),
  riderOnTheWay,
);
router.put(
  "/:bookingId/reached-pickup",
  protect,
  authorize("driver"),
  reachedPickup,
);
router.put("/:bookingId/start", protect, authorize("driver"), startRide);
router.put("/:bookingId/complete", protect, authorize("driver"), completeRide);
router.get("/:bookingId/status", protect, getRideStatus);

// PAYMENT METHOD ROUTES
router.post("/payment/setup", protect, setupPaymentMethod);
router.get("/payment/cards", protect, getUserCards);
router.put("/payment/default-card", protect, setDefaultCard);
router.delete("/payment/card/:paymentMethodId", protect, removeCard);
router.get("/payment/status/:bookingId", protect, getPaymentStatus);

module.exports = router;
