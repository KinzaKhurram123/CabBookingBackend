const mongoose = require("mongoose");

const rideBookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: ["cab", "bike", "parcel", "pet"],
      required: true,
    },
    selectedVehicle: {
      type: String,
      enum: ["cab", "bike", "economy", "sedan", "suv", "luxury"],
    },
    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        index: "2dsphere",
      },
    },
    dropoffLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    pickupLocationName: {
      type: String,
      required: true,
    },
    dropoffLocationName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "ongoing", "completed", "cancelled"],
      default: "pending",
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      required: false,
    },
    fare: {
      type: String,
    },
    distance: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    duration: {
      type: String,
    },
    paymentMethod: {
      type: String,
    },
    price: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
      required: false,
    },
    paymentType: {
      type: String,
      enum: ["Cash", "Card"],
      required: false,
      default: "Cash",
    },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

rideBookingSchema.index({ pickupLocation: "2dsphere" });

module.exports = mongoose.model("RideBooking", rideBookingSchema);
