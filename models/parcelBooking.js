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
    time: { type: String },
    duration: { type: String },
    estimateTime: { type: String, required: true },
    totalFare: { type: Number, required: true },
    fare: { type: String },
    price: { type: Number },
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
    paymentIntentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "authorized", "captured", "failed", "refunded", "cancelled"],
      default: "pending",
    },
    paymentType: {
      type: String,
      enum: ["Cash", "Card"],
      default: "Cash",
    },
    paymentMethod: { type: String },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "onTheWay",
        "arrived",
        "inProgress",
        "completed",
        "cancelled",
        "rejected",
      ],
      default: "pending",
    },
    notes: { type: String, default: "" },
    parcel_type: {
      type: String,
      enum: [
        "document",
        "electronics",
        "fragile",
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
    acceptedAt: Date,
    onTheWayAt: Date,
    arrivedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancellationDetails: {
      cancelledAt: Date,
      cancelledBy: String,
      reason: String,
    },
    statusHistory: [
      {
        status: String,
        changedBy: mongoose.Schema.Types.ObjectId,
        userRole: String,
        reason: String,
        changedAt: Date,
      },
    ],
    locationHistory: [
      {
        location: {
          type: {
            type: String,
            enum: ["Point"],
          },
          coordinates: [Number],
        },
        timestamp: Date,
      },
    ],
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

parcelBookingSchema.index({ pickupLocation: "2dsphere" });

module.exports = mongoose.model("ParcelBooking", parcelBookingSchema);
