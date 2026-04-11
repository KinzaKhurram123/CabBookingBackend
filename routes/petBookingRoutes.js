const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { riderProtect } = require("../middleware/riderAuthMiddleware");
const {
  createPetDeliveryBooking,
  getAllPetDeliveryBookings,
  getPetDeliveryBookingById,
  cancelPetDeliveryBooking,
  driverCancelPetDelivery,
  adminCancelPetDelivery,
  acceptPetDelivery,
  petDeliveryOnTheWay,
  petDeliveryReachedPickup,
  startPetDelivery,
  completePetDelivery,
  updatePetDeliveryDriverLocation,
  getPetDeliveryDriverLocation,
  getPetDeliveryLocationHistory,
  getNearbyPetDeliveries,
  getPetDeliveryStatus,
  getAllPetDeliveriesForDriver,
  getCancelledPetDeliveries,
} = require("../controllers/petDeliveryBookingController");

// Create booking
router.post("/pet_delivery_booking", protect, createPetDeliveryBooking);

// Get all bookings
router.get("/get_pet_delivery", getAllPetDeliveryBookings);

// Get booking by ID
router.get("/pet_delivery/:id", getPetDeliveryBookingById);

// Driver workflow endpoints
router.post("/accept/:bookingId", protect, riderProtect, acceptPetDelivery);
router.put(
  "/:bookingId/on-the-way",
  protect,
  riderProtect,
  petDeliveryOnTheWay,
);
router.put(
  "/:bookingId/reached-pickup",
  protect,
  riderProtect,
  petDeliveryReachedPickup,
);
router.put("/:bookingId/start", protect, riderProtect, startPetDelivery);
router.put("/:bookingId/complete", protect, riderProtect, completePetDelivery);

// Cancellation endpoints
router.put("/bookings/:bookingId/cancel", protect, cancelPetDeliveryBooking);
router.put(
  "/driver/bookings/:bookingId/cancel",
  protect,
  riderProtect,
  driverCancelPetDelivery,
);
router.put(
  "/admin/bookings/:bookingId/cancel",
  protect,
  adminCancelPetDelivery,
);

// Location tracking endpoints
router.put(
  "/:bookingId/update-location",
  protect,
  riderProtect,
  updatePetDeliveryDriverLocation,
);
router.get("/:bookingId/track", protect, getPetDeliveryDriverLocation);
router.get(
  "/:bookingId/location-history",
  protect,
  getPetDeliveryLocationHistory,
);

// Supporting endpoints
router.get("/nearby", riderProtect, getNearbyPetDeliveries);
router.get("/:bookingId/status", protect, getPetDeliveryStatus);
router.get(
  "/driver/deliveries",
  protect,
  riderProtect,
  getAllPetDeliveriesForDriver,
);
router.get("/bookings/cancelled", protect, getCancelledPetDeliveries);

module.exports = router;
