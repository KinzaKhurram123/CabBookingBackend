const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Generic booking reference — works for ride, parcel, pet
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Booking ID is required"],
      index: true,
    },
    bookingType: {
      type: String,
      enum: ["ride", "parcel", "pet"],
      required: [true, "Booking type is required"],
      default: "ride",
    },
    // Keep rideId for backward compatibility with existing ride chat
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RideBooking",
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver is required"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ bookingId: 1, bookingType: 1, createdAt: -1 });
messageSchema.index({ rideId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model("Message", messageSchema);
