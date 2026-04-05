const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    phoneNumber: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin"],
      default: "admin",
    },
    permissions: {
      manageRiders: { type: Boolean, default: false },
      manageDrivers: { type: Boolean, default: false },
      manageUsers: { type: Boolean, default: false },
      managePayments: { type: Boolean, default: false },
      viewReports: { type: Boolean, default: false },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Admin", adminSchema);
