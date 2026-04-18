const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    module: {
      type: String,
      enum: [
        "users",
        "drivers",
        "rides",
        "payments",
        "promotions",
        "reports",
        "admins",
        "settings",
      ],
      required: true,
    },
    action: {
      type: String,
      enum: ["create", "read", "update", "delete", "manage"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Permission", permissionSchema);
