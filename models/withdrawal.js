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
      min: 60, // Updated minimum for instant payouts
      max: 10000,
    },
    payoutType: {
      type: String,
      enum: ["weekly", "instant"],
      default: "instant",
    },
    fee: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "approved", "rejected", "paid"],
      default: "pending",
    },
    bankAccount: {
      accountTitle: String,
      accountNumber: String,
      bankName: String,
      branchCode: String,
      iban: String,
      routingNumber: String,
      cardNumber: String,
    },
    paymentMethodId: {
      type: String,
      default: null,
    },
    stripeTransferId: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
      default: null,
    },
    failureReason: {
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
withdrawalSchema.index({ payoutType: 1, status: 1, createdAt: -1 });
withdrawalSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
