const mongoose = require("mongoose");

const rideTypeSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ["standard", "economy", "premium", "special"],
    },
    categoryDisplayName: {
      type: String,
      required: true,
    },
    categoryDescription: String,
    categoryIcon: String,
    categoryColor: String,
    rideId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    features: [String],
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    capacity: {
      type: Number,
      required: true,
      default: 4,
    },
    luggageCapacity: {
      type: Number,
      default: 2,
    },
    timeEstimate: {
      type: String,
      default: "Real time in Minutes, wait time",
    },
    icon: {
      type: String,
      default: "car",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("RideType", rideTypeSchema);
