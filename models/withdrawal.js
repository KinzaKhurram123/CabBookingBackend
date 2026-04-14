const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
  {
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [100, "Minimum withdrawal amount is 100"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },
    bankAccount: {
      accountTitle: { type: String },
      accountNumber: { type: String },
      bankName: { type: String },
      branchCode: { type: String },
    },
    rejectionReason: { type: String, default: null },
    processedAt: { type: Date, default: null },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    note: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
