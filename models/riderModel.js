const mongoose = require("mongoose");

const riderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  vehicleType: {
    type: String,
    enum: ["sedan", "hatchback", "suv", "minivan"],
    required: true,
  },
  vehicleNumber: {
    type: String,
    required: true,
  },
  licenseNumber: {
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
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  status: {
    type: String,
    enum: ["available", "busy", "offline"],
    default: "offline",
  },
  currentRide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RideBooking",
  },
});

riderSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Rider", riderSchema);
