const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    profileImage: {
      type: String,
      default: null,
    },
    profileImageDetails: {
      url: String,
      publicId: String,
    },

    zipPostelCode: { type: String },
    city: { type: String },
    country: { type: String, default: "Pakistan" },

    role: {
      type: String,
      enum: ["customer", "driver"],
      required: true,
    },

    driverDetails: {
      isVerified: { type: Boolean, default: false },
      verificationStatus: {
        type: String,
        enum: ["pending", "in_review", "approved", "rejected"],
        default: "pending",
      },
      status: {
        type: String,
        enum: ["active", "inactive", "suspended", "pending_verification"],
        default: "pending_verification",
      },
      rejectionReason: { type: String, default: null },
      verifiedAt: { type: Date, default: null },

      documents: {
        license: {
          frontImage: { type: String },
          backImage: { type: String },
          licenseNumber: { type: String },
          expiryDate: { type: Date },
          status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
          },
        },
        insurance: {
          documentUrl: { type: String },
          provider: { type: String },
          policyNumber: { type: String },
          expiryDate: { type: Date },
          status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
          },
        },
        profilePhoto: {
          url: { type: String },
          status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
          },
        },
        vehicleRegistration: {
          documentUrl: { type: String },
          registrationNumber: { type: String },
          status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
          },
        },
      },

      vehicleDetails: {
        category: { type: String, enum: ["cab", "bike", "parcel", "pet"] },
        vehicleType: {
          type: String,
          enum: ["sedan", "hatchback", "suv", "minivan", "bike", "auto"],
        },
        make: { type: String },
        model: { type: String },
        year: { type: Number },
        color: { type: String },
        licensePlate: { type: String, unique: true, sparse: true },
        vehicleNumber: { type: String },
      },

      termsAccepted: { type: Boolean, default: false },
      termsAcceptedAt: { type: Date },

      totalRides: { type: Number, default: 0 },
      totalEarning: { type: Number, default: 0 },
      rating: { type: Number, default: 5.0 },
    },

    resetOTP: { type: Number },
    otpExpiry: { type: Date },
  },
  { timestamps: true },
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(8);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
