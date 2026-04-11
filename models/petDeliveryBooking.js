const mongoose = require("mongoose");

const petDeliveryBookingSchema = new mongoose.Schema(
  {
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
    dropoffLocationName: {
      type: String,
      required: true,
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
    distance: { type: String },
    time: { type: String },
    duration: { type: String },
    fare: { type: String },
    price: { type: Number },
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
    selected_item: { type: mongoose.Schema.Types.Mixed },
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

petDeliveryBookingSchema.index({ pickupLocation: "2dsphere" });

module.exports = mongoose.model("PetDeliveryBooking", petDeliveryBookingSchema);
