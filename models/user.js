const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // profileImage: {
    //   type: String,
    //   default:
    //     "https://res.cloudinary.com/your-cloud/image/upload/v1/default-avatar.png",
    // },
    // profileImageDetails: {
    //   url: String,
    //   publicId: String,
    // },
    resetOTP: { type: Number },
    otpExpiry: { type: Date },
    phoneNumber: { type: String, required: true },
    zipPostelCode: { type: String },
    city: { type: String },
    country: { type: String },
    role: {
      type: String,
      enum: ["customer", "driver"],
      required: true,
    },
  },
  { timestamps: true },
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(8);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("User", UserSchema);
