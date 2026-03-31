const express = require("express");
const router = express.Router();
const {
  createRideBooking,
  getNearbyRides,
  getAllRides,
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
const { riderProtect } = require("../middleware/riderAuthMiddleware");

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

// router.put("/accept_ride/:bookingId", protect, authorize("driver"), acceptRide);

router.put("/accept_ride/:bookingId", riderProtect, acceptRide);
router.put("/:bookingId/on-the-way", protect, riderOnTheWay);
router.put("/:bookingId/reached-pickup", protect, reachedPickup);
router.put("/:bookingId/start", protect, startRide);
router.put("/:bookingId/complete", protect, completeRide);
router.get("/:bookingId/status", protect, getRideStatus);

router.post("/payment/setup", protect, setupPaymentMethod);
router.get("/payment/cards", protect, getUserCards);
router.put("/payment/default-card", protect, setDefaultCard);
router.delete("/payment/card/:paymentMethodId", protect, removeCard);
router.get("/payment/status/:bookingId", protect, getPaymentStatus);

const fixBookingStatus = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    const booking = await RideBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    console.log("Old status:", booking.status);
    booking.status = "pending";
    booking.updatedAt = new Date();
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking status changed from cancelled to pending",
      booking: {
        id: booking._id,
        status: booking.status,
        pickupLocation: booking.pickupLocationName,
        dropoffLocation: booking.dropoffLocationName,
      },
    });
  } catch (error) {
    console.error("Error fixing booking:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

router.put(
  "/fix-booking-status/:bookingId",
  protect,
  authorize("admin", "driver"),
  fixBookingStatus,
);

module.exports = router;
