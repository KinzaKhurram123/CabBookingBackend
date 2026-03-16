const mongoose = require("mongoose");

const parcelBookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverName: { type: String, required: true },
    receiverPhoneNumber: { type: String, required: true },
    cargoType: { type: String, required: true },
    selectedVehicle: { type: String, required: true },
    weight: { type: Number, required: true },
    height: { type: Number, required: true },
    length: { type: Number, required: true },
    numberOfPackages: { type: Number, required: true },
    fragileItem: { type: Boolean, default: false },
    distance: { type: Number, required: true },
    estimateTime: { type: String, required: true },
    totalFare: { type: Number, required: true },
    pickupLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
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
    notes: { type: String, default: "" },
    parcel_type: {
      type: String,
      enum: [
        "document",
        "electronics",
        "fargile",
        "household",
        "large",
        "medications",
        "small",
        "other",
      ],
      default: "other",
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      required: false,
    },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ParcelBooking", parcelBookingSchema);
