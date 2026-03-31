const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "busy", "offline"],
    default: "offline",
  },
});

module.exports = mongoose.model("Driver", driverSchema);
