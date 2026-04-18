const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["super_admin", "admin", "manager", "support"],
    },
    description: {
      type: String,
    },
    permissions: {
      manageUsers: { type: Boolean, default: false },
      manageDrivers: { type: Boolean, default: false },
      manageRides: { type: Boolean, default: false },
      managePayments: { type: Boolean, default: false },
      managePromotions: { type: Boolean, default: false },
      viewReports: { type: Boolean, default: false },
      manageAdmins: { type: Boolean, default: false },
      manageSettings: { type: Boolean, default: false },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Role", roleSchema);
