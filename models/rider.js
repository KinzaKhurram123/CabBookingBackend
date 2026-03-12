const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const RiderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  riderId: { type: String, required: true },
  startLocation: { type: String, required: true },
  endLocation: { type: String, required: true },
  distance: { type: String, required: true },
  duration: { type: String, required: true },
  routeCoordinates: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  totalRides: { type: Number, default: 0 },
  totalEarning: { type: String, default: 0 },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
  category: {
    type: String,
    enum: ["cab", "bike", "parcel", "pet"],
    required: true,
  },
  vehicleType: {
    type: String,
    enum: ["sedan", "hatchback", "suv", "minivan"],
    required: true,
  },
  vechicalNumber: {
    type: String,
    required: true,
  },
  licenseNumber: {
    type: String,
    required: true,
  },
  ExpiryDate: {
    type: Date,
    required: true,
  },
  InsuranceProvider: {
    type: String,
    required: true,
  },
  policyNumber: {
    type: String,
    required: true,
  },
  make: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  licensePlate: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("RiderSchema", RiderSchema);
