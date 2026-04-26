const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
  {
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 100,
      max: 10000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },
    bankAccount: {
      accountTitle: String,
      accountNumber: String,
      bankName: String,
      branchCode: String,
      iban: String,
    },
    paymentMethodId: {
      type: String,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      default: null,
    },
    transactionId: {
      type: String,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

withdrawalSchema.index({ rider: 1, status: 1, createdAt: -1 });
withdrawalSchema.index({ userId: 1, status: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });
withdrawalSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
