const mongoose = require("mongoose");

const referralTransactionSchema = new mongoose.Schema(
  {
    // Who earned the reward
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Who was referred (new user)
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      enum: ["referral_bonus", "referral_signup", "booking_cashback"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    bookingType: {
      type: String,
      enum: ["ride", "parcel", "pet"],
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "credited", "expired"],
      default: "credited",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ReferralTransaction", referralTransactionSchema);
