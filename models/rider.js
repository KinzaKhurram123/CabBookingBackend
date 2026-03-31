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
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      features: {
        type: String,
        required: true,
      },
      capacity: {
        type: Number,
        required: true,
      },
      price: {
        type: String,
        default: "varies",
      },
      time: {
        type: String,
        default: "Real time in Minutes, wait time",
      },
    },
    paymentIntentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "authorized", "captured", "failed", "refunded"],
    },
    paymentType: {
      type: String,
      enum: ["Cash", "Card"],
      required: false,
      default: "Cash",
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

    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

rideBookingSchema.index({ pickupLocation: "2dsphere" });

const RideBooking =
  mongoose.models.RideBooking ||
  mongoose.model("RideBooking", rideBookingSchema);

module.exports = RideBooking; 
