const mongoose = require("mongoose");

const RiderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },

  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationStatus: {
    type: String,
    enum: ["pending", "in_review", "approved", "rejected"],
    default: "pending",
  },
  rejectionReason: { type: String, default: null },
  verifiedAt: { type: Date, default: null },

  documents: {
    license: {
      frontImage: { type: String, required: false },
      backImage: { type: String, required: false },
      licenseNumber: { type: String, required: false },
      expiryDate: { type: Date, required: false },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      rejectionReason: { type: String, default: null },
      uploadedAt: { type: Date, default: null },
    },

    insurance: {
      documentUrl: { type: String, required: false },
      provider: { type: String, required: false },
      policyNumber: { type: String, required: false },
      expiryDate: { type: Date, required: false },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      rejectionReason: { type: String, default: null },
      uploadedAt: { type: Date, default: null },
    },

    profilePhoto: {
      url: { type: String, required: false },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      uploadedAt: { type: Date, default: null },
    },

    vehicleRegistration: {
      documentUrl: { type: String, required: false },
      registrationNumber: { type: String, required: false },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      uploadedAt: { type: Date, default: null },
    },
  },

  vehicleDetails: {
    category: {
      type: String,
      enum: ["cab", "bike", "parcel", "pet"],
      required: false,
    },
    vehicleType: {
      type: String,
      enum: ["sedan", "hatchback", "suv", "minivan", "bike", "auto"],
      required: false,
    },
    make: { type: String, required: false },
    model: { type: String, required: false },
    year: { type: Number, required: false },
    color: { type: String, required: false },
    licensePlate: { type: String, required: false, unique: true, sparse: true },
    vehicleNumber: { type: String, required: false },
  },

  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },
  address: { type: String, default: null },
  city: { type: String, default: null },

  emergencyContact: {
    name: { type: String, default: null },
    relationship: { type: String, default: null },
    phoneNumber: { type: String, default: null },
  },

  termsAccepted: { type: Boolean, default: false },
  termsAcceptedAt: { type: Date, default: null },

  totalRides: { type: Number, default: 0 },
  totalEarning: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0, min: 0, max: 5 },

  status: {
    type: String,
    enum: ["active", "inactive", "suspended", "pending_verification"],
    default: "pending_verification",
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

RiderSchema.index({ location: "2dsphere" });
RiderSchema.index(
  { "vehicleDetails.licensePlate": 1 },
  { unique: true, sparse: true },
);

module.exports = mongoose.model("Rider", RiderSchema);
