const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const RideBooking = require("../models/rideBooking");
const ParcelBooking = require("../models/parcelBooking");
const PetDeliveryBooking = require("../models/petDeliveryBooking");

exports.getUserProfile = async (req, res) => {
  try {
    const User = require('../models/user');
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
        role: user.role,
        walletBalance: user.walletBalance,
        referralCode: user.referralCode,
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "profile_images",
          public_id: `user_${req.user._id}_${Date.now()}`,
          transformation: [{ width: 400, height: 400, crop: "limit" }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(req.file.buffer);
    });

    const User = require('../models/user');
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: result.secure_url },
      { new: true },
    ).select("-password");

    res.json({
      success: true,
      message: "Profile image updated successfully",
      profileImage: result.secure_url,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
    });
  }
};

// Update FCM token
exports.updateFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    const User = require("../models/user");
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fcmToken: fcmToken },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "FCM token updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        fcmToken: user.fcmToken,
      },
    });
  } catch (error) {
    console.error("Update FCM token error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get current active booking
exports.getCurrentActiveBooking = async (req, res) => {
  try {
    const userId = req.user._id;
    const activeStatuses = ["pending", "accepted", "onTheWay", "arrived", "inProgress"];
    const allActiveBookings = [];

    // Get all active ride bookings
    const rideBookings = await RideBooking.find({
      user: userId,
      status: { $in: activeStatuses },
    })
      .populate("driver", "name phone profileImage vehicleDetails location")
      .sort({ createdAt: -1 })
      .lean();

    rideBookings.forEach((booking) => {
      allActiveBookings.push({
        bookingType: "ride",
        ...booking,
        driverLocation: booking.driver?.location?.coordinates
          ? {
              latitude: booking.driver.location.coordinates[1],
              longitude: booking.driver.location.coordinates[0],
            }
          : null,
      });
    });

    // Get all active parcel deliveries
    const parcelBookings = await ParcelBooking.find({
      user: userId,
      status: { $in: activeStatuses },
    })
      .populate("driver", "name phone profileImage vehicleDetails location")
      .sort({ createdAt: -1 })
      .lean();

    parcelBookings.forEach((booking) => {
      allActiveBookings.push({
        bookingType: "parcel",
        ...booking,
        driverLocation: booking.driver?.location?.coordinates
          ? {
              latitude: booking.driver.location.coordinates[1],
              longitude: booking.driver.location.coordinates[0],
            }
          : null,
      });
    });

    // Get all active pet deliveries
    const petDeliveryBookings = await PetDeliveryBooking.find({
      user: userId,
      status: { $in: activeStatuses },
    })
      .populate("driver", "name phone profileImage vehicleDetails location")
      .sort({ createdAt: -1 })
      .lean();

    petDeliveryBookings.forEach((booking) => {
      allActiveBookings.push({
        bookingType: "petDelivery",
        ...booking,
        driverLocation: booking.driver?.location?.coordinates
          ? {
              latitude: booking.driver.location.coordinates[1],
              longitude: booking.driver.location.coordinates[0],
            }
          : null,
      });
    });

    // Sort all bookings by creation date (most recent first)
    allActiveBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      hasActiveBooking: allActiveBookings.length > 0,
      count: allActiveBookings.length,
      bookings: allActiveBookings,
      message: allActiveBookings.length === 0 ? "No active bookings found" : undefined,
    });
  } catch (error) {
    console.error("Get current active booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// REQUEST ACCOUNT DELETION (User)
// Deactivates immediately, deletes after 3 days
// DELETE /api/users/account
// ─────────────────────────────────────────────
exports.requestAccountDeletion = async (req, res) => {
  try {
    const User = require('../models/user');
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account deletion already requested',
        scheduledDeletionAt: user.scheduledDeletionAt
      });
    }

    const scheduledDeletionAt = new Date();
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 3); // 3 days from now

    user.isActive = false;
    user.deletionRequestedAt = new Date();
    user.scheduledDeletionAt = scheduledDeletionAt;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deactivated. It will be permanently deleted after 3 days.',
      deletionRequestedAt: user.deletionRequestedAt,
      scheduledDeletionAt: user.scheduledDeletionAt
    });
  } catch (error) {
    console.error('Request account deletion error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ─────────────────────────────────────────────
// CANCEL ACCOUNT DELETION (User) — restore account
// POST /api/users/account/restore
// ─────────────────────────────────────────────
exports.cancelAccountDeletion = async (req, res) => {
  try {
    const User = require('../models/user');
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isActive) {
      return res.status(400).json({ success: false, message: 'Account is already active' });
    }

    user.isActive = true;
    user.deletionRequestedAt = null;
    user.scheduledDeletionAt = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deletion cancelled. Your account has been restored.'
    });
  } catch (error) {
    console.error('Cancel account deletion error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUBLIC ACCOUNT DELETION (No token required)
// For website public page / Google Play Store requirement
// POST /api/users/delete-account-public
// Body: { email, password, role }
// role: "customer" (default) or "driver"
// ─────────────────────────────────────────────
exports.publicAccountDeletion = async (req, res) => {
  try {
    const User = require('../models/user');
    const Rider = require('../models/riderModel');
    const bcrypt = require('bcryptjs');

    const { email, password, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Check if already requested
    if (!user.isActive && user.scheduledDeletionAt) {
      return res.status(400).json({
        success: false,
        message: 'Account deletion already requested',
        scheduledDeletionAt: user.scheduledDeletionAt
      });
    }

    const scheduledDeletionAt = new Date();
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 3);

    // Deactivate user
    user.isActive = false;
    user.deletionRequestedAt = new Date();
    user.scheduledDeletionAt = scheduledDeletionAt;
    await user.save();

    // If driver — also deactivate rider profile
    if (user.role === 'driver') {
      await Rider.findOneAndUpdate(
        { user: user._id },
        {
          isActive: false,
          status: 'offline',
          deletionRequestedAt: user.deletionRequestedAt,
          scheduledDeletionAt: user.scheduledDeletionAt
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Your account has been deactivated and will be permanently deleted after 3 days.',
      email: user.email,
      deletionRequestedAt: user.deletionRequestedAt,
      scheduledDeletionAt: user.scheduledDeletionAt
    });
  } catch (error) {
    console.error('Public account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
