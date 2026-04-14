// models/riderModel.js - COMPLETE FIXED VERSION
const mongoose = require("mongoose");

const riderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    
    phoneNumber: {
      type: String,
      default: "",
    },
    
    vehicleDetails: {
      category: { type: String, default: null },
      vehicleType: { type: String, default: null },
      make: { type: String, default: null },
      model: { type: String, default: null },
      year: { type: String, default: null },
      color: { type: String, default: null },
      licensePlate: { type: String, default: null },
      vehicleNumber: { type: String, default: null },
    },
    
    // ✅ CRITICAL: Define documents properly
    documents: {
      license: {
        licenseNumber: { type: String, default: null },
        expiryDate: { type: Date, default: null },
        frontImage: { type: String, default: null },
        backImage: { type: String, default: null },
        status: { 
          type: String, 
          enum: ["pending", "approved", "rejected"],
          default: "pending" 
        },
        rejectionReason: { type: String, default: null },
        uploadedAt: { type: Date, default: null },
      },
      insurance: {
        provider: { type: String, default: null },
        policyNumber: { type: String, default: null },
        expiryDate: { type: Date, default: null },
        documentUrl: { type: String, default: null },
        status: { 
          type: String, 
          enum: ["pending", "approved", "rejected"],
          default: "pending" 
        },
        rejectionReason: { type: String, default: null },
        uploadedAt: { type: Date, default: null },
      },
      profilePhoto: {
        url: { type: String, default: null },
        status: { 
          type: String, 
          enum: ["pending", "approved", "rejected"],
          default: "pending" 
        },
        uploadedAt: { type: Date, default: null },
      },
      vehicleRegistration: {
        documentUrl: { type: String, default: null },
        registrationNumber: { type: String, default: null },
        status: { 
          type: String, 
          enum: ["pending", "approved", "rejected"],
          default: "pending" 
        },
        uploadedAt: { type: Date, default: null },
      },
    },
    
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    
    status: {
      type: String,
      enum: ["available", "busy", "offline", "pending_verification", "inactive"],
      default: "offline",
    },
    
    currentRide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RideBooking",
      default: null,
    },
    
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    verificationStatus: {
      type: String,
      enum: ["pending", "in_review", "approved", "rejected"],
      default: "pending",
    },
    
    rejectionReason: {
      type: String,
      default: null,
    },
    
    verifiedAt: {
      type: Date,
      default: null,
    },
    
    totalRides: {
      type: Number,
      default: 0,
    },
    
    totalEarning: {
      type: Number,
      default: 0,
    },

    // Wallet
    walletBalance: {
      type: Number,
      default: 0,
    },

    pendingEarnings: {
      type: Number,
      default: 0,
    },

    totalWithdrawn: {
      type: Number,
      default: 0,
    },

    // Bank account for withdrawal
    bankAccount: {
      accountTitle: { type: String, default: null },
      accountNumber: { type: String, default: null },
      bankName: { type: String, default: null },
      branchCode: { type: String, default: null },
      isVerified: { type: Boolean, default: false },
    },
    
    rating: {
      type: Number,
      default: 5,
    },
    
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    
    termsAcceptedAt: {
      type: Date,
      default: null,
    },
    
    address: {
      type: String,
      default: null,
    },
    
    city: {
      type: String,
      default: null,
    },
    
    emergencyContact: {
      name: { type: String, default: null },
      phone: { type: String, default: null },
      relation: { type: String, default: null },
    },
    
    adminNotes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

riderSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Rider", riderSchema);