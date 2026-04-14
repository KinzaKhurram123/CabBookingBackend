const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ticketNumber: {
      type: String,
      unique: true,
    },
    category: {
      type: String,
      enum: [
        "booking_issue",
        "payment_issue",
        "driver_complaint",
        "app_bug",
        "account_issue",
        "refund_request",
        "other",
      ],
      required: true,
    },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    // Related booking (optional)
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    bookingType: {
      type: String,
      enum: ["ride", "parcel", "pet"],
      default: null,
    },
    replies: [replySchema],
    resolvedAt: { type: Date, default: null },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Auto generate ticket number
supportTicketSchema.pre("save", async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model("SupportTicket").countDocuments();
    this.ticketNumber = `TKT${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
