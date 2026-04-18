const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    appName: {
      type: String,
      default: "RideLynk",
    },
    appVersion: {
      type: String,
      default: "1.0.0",
    },
    contactEmail: {
      type: String,
    },
    contactPhone: {
      type: String,
    },
    address: {
      type: String,
    },
    currency: {
      type: String,
      default: "USD",
    },
    currencySymbol: {
      type: String,
      default: "$",
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    commissionRate: {
      type: Number,
      default: 10,
    },
    referralBonus: {
      type: Number,
      default: 5,
    },
    minRideFare: {
      type: Number,
      default: 2,
    },
    baseFare: {
      type: Number,
      default: 1,
    },
    perKmRate: {
      type: Number,
      default: 0.5,
    },
    perMinuteRate: {
      type: Number,
      default: 0.2,
    },
    cancellationFee: {
      type: Number,
      default: 2,
    },
    features: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    socialLinks: {
      facebook: { type: String },
      twitter: { type: String },
      instagram: { type: String },
      linkedin: { type: String },
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Settings", settingsSchema);
