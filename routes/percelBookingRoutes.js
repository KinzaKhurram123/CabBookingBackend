const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { riderProtect } = require("../middleware/riderAuthMiddleware");
const {
  createParcelBooking,
  getAllParcelBookings,
  getParcelBookingById,
  cancelParcelBooking,
  driverCancelParcelDelivery,
  adminCancelParcelDelivery,
  acceptParcelDelivery,
  parcelDeliveryOnTheWay,
  parcelDeliveryReachedPickup,
  startParcelDelivery,
  completeParcelDelivery,
  updateParcelDeliveryDriverLocation,
  getParcelDeliveryDriverLocation,
  getParcelDeliveryLocationHistory,
  getNearbyParcelDeliveries,
  getParcelDeliveryStatus,
  getAllParcelDeliveriesForDriver,
  getCancelledParcelDeliveries,
} = require("../controllers/parcelBookingController");

// Create booking
router.post("/create", protect, createParcelBooking);

// Get all bookings
router.get("/all", getAllParcelBookings);

// Get booking by ID
router.get("/:id", protect, getParcelBookingById);

// Driver workflow endpoints
router.post("/accept/:bookingId", protect, riderProtect, acceptParcelDelivery);
router.put("/:bookingId/on-the-way", protect, riderProtect, parcelDeliveryOnTheWay);
router.put("/:bookingId/reached-pickup", protect, riderProtect, parcelDeliveryReachedPickup);
router.put("/:bookingId/start", protect, riderProtect, startParcelDelivery);
router.put("/:bookingId/complete", protect, riderProtect, completeParcelDelivery);

// Cancellation endpoints
router.put("/bookings/:bookingId/cancel", protect, cancelParcelBooking);
router.put("/driver/bookings/:bookingId/cancel", protect, riderProtect, driverCancelParcelDelivery);
router.put("/admin/bookings/:bookingId/cancel", protect, adminCancelParcelDelivery);

// Location tracking endpoints
router.put("/:bookingId/update-location", protect, riderProtect, updateParcelDeliveryDriverLocation);
router.get("/:bookingId/track", protect, getParcelDeliveryDriverLocation);
router.get("/:bookingId/location-history", protect, getParcelDeliveryLocationHistory);

// Supporting endpoints
router.get("/nearby", riderProtect, getNearbyParcelDeliveries);
router.get("/:bookingId/status", protect, getParcelDeliveryStatus);
router.get("/driver/deliveries", protect, riderProtect, getAllParcelDeliveriesForDriver);
router.get("/bookings/cancelled", protect, getCancelledParcelDeliveries);

module.exports = router;
