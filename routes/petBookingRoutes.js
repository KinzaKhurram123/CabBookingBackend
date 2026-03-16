const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createPetDeliveryBooking,
  getAllPetDeliveryBookings,
  getPetDeliveryBookingById,
  cancelPetDeliveryBooking,
} = require("../controllers/petDeliveryBookingController");

router.post("/pet_delivery_booking", protect, createPetDeliveryBooking);

router.get("/get_pet-delivery", getAllPetDeliveryBookings);

router.get("/pet-delivery/:id", getPetDeliveryBookingById);

router.put("/pet-delivery/:id/cancel", cancelPetDeliveryBooking);

module.exports = router;
