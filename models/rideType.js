// RideType Model
const mongoose = require("mongoose");

const rideTypeSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ["standard", "economy", "premium", "special"],
    },
    categoryDisplayName: String,
    categoryDescription: String,
    rideId: String,
    name: String,
    features: String,
    priceModel: {
      type: String,
      default: "varies",
    },
    capacity: Number,
    timeEstimate: {
      type: String,
      default: "Real time in Minutes, wait time",
    },
    icon: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    order: Number,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("RideType", rideTypeSchema);
