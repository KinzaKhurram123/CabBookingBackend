const mongoose = require("mongoose");

const petDeliveryBookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  booking_type: { type: String, default: "pet_delivery" },
  category: { type: String, default: "pet" },
  pet_name: { type: String, required: true },
  pet_type: { type: String, required: true },
  breed: { type: String },
  age: { type: String },
  weight_kg: { type: String },
  number_of_pets: { type: String },
  carrier_required: { type: Boolean, default: false },
  is_vaccinated: { type: Boolean, default: false },
  medical_conditions: { type: String },
  special_instructions: { type: String },
  length_cm: { type: String },
  width_cm: { type: String },
  height_cm: { type: String },
  owner_name: { type: String, required: true },
  owner_phone: { type: String, required: true },
  pickupLocationName: {
    type: String,
    required: true,
  },
  pickupLocationName: {
    type: String,
    required: true,
  },
  pickupLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  dropoffLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  distance: { type: String },
  time: { type: String },
  price: { type: Number },
  selected_item: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "accepted", "cancelled", "completed"],
    default: "pending",
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider",
    required: false,
  },
});

module.exports = mongoose.model("PetDeliveryBooking", petDeliveryBookingSchema);
