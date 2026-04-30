const Admin = require("../models/admin");
const User = require("../models/user");
const Driver = require("../models/driverModel");
const Booking = require("../models/rideBooking");
const Promotion = require("../models/promotion");
const Settings = require("../models/settings");
const Role = require("../models/role");
const Permission = require("../models/permission");
const Rider = require("../models/riderModel");
const RideType = require("../models/rideType");
const stripe = require("../config/stripe");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// ============================================
// 1. AUTHENTICATION APIS
// ============================================

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, admin.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(admin._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          isActive: admin.isActive,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.adminRegister = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, role, permissions } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role: role || "admin",
      permissions: permissions || {},
      isActive: true,
    });

    const token = generateToken(newAdmin._id);

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        admin: {
          _id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.adminLogout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    admin.resetOTP = otp;
    admin.otpExpiry = Date.now() + 10 * 60 * 1000;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      data: { otp },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin || admin.resetOTP !== otp || admin.otpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    admin.resetOTP = undefined;
    admin.otpExpiry = undefined;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const newToken = generateToken(decoded.id);

    res.status(200).json({
      success: true,
      data: { token: newToken },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

// ============================================
// 2. DASHBOARD APIS
// ============================================

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalDrivers,
      totalBookings,
      completedBookings,
      pendingBookings,
      cancelledBookings,
      totalRevenue,
      pendingVerifications,
    ] = await Promise.all([
      User.countDocuments(),
      Driver.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "completed" }),
      Booking.countDocuments({ status: "pending" }),
      Booking.countDocuments({ status: "cancelled" }),
      Booking.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$fare" } } },
      ]),
      Driver.countDocuments({
        verificationStatus: "pending",
        isVerified: false,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalDrivers,
        totalBookings,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingVerifications,
        percentageChange: {
          users: "+12%",
          drivers: "+8%",
          rides: "+15%",
          revenue: "+20%",
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getDashboardChartData = async (req, res) => {
  try {
    const monthlyData = await Booking.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          rides: { $sum: 1 },
          revenue: { $sum: "$fare" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const chartData = months.map((month, index) => {
      const data = monthlyData.find((d) => d._id === index + 1);
      return {
        month,
        rides: data?.rides || 0,
        revenue: data?.revenue || 0,
      };
    });

    res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getRideStatusStats = async (req, res) => {
  try {
    const completed = await Booking.countDocuments({ status: "completed" });
    const inProgress = await Booking.countDocuments({ status: "in_progress" });
    const cancelled = await Booking.countDocuments({ status: "cancelled" });
    const pending = await Booking.countDocuments({ status: "pending" });

    res.status(200).json({
      success: true,
      data: {
        completed,
        inProgress,
        cancelled,
        pending,
        labels: ["Completed", "In Progress", "Cancelled", "Pending"],
        colors: ["#4CAF50", "#2196F3", "#F44336", "#FFC107"],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 3. USER MANAGEMENT APIS
// ============================================

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = search ? { name: { $regex: search, $options: "i" } } : {};

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, phoneNumber, city, country, isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phoneNumber, city, country, isBlocked },
      { new: true, runValidators: true },
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true },
    );
    res.status(200).json({
      success: true,
      message: "User blocked successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true },
    );
    res.status(200).json({
      success: true,
      message: "User unblocked successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 4. DRIVER MANAGEMENT APIS
// ============================================

exports.getAllDrivers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, verificationStatus, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (verificationStatus) query.verificationStatus = verificationStatus;

    let riders = await Rider.find(query)
      .populate("user", "name email phoneNumber profileImage city country createdAt")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Apply search filter on populated user fields
    if (search) {
      const s = search.toLowerCase();
      riders = riders.filter((r) =>
        r.user?.name?.toLowerCase().includes(s) ||
        r.user?.email?.toLowerCase().includes(s) ||
        r.user?.phoneNumber?.toLowerCase().includes(s) ||
        r.vehicleDetails?.licensePlate?.toLowerCase().includes(s)
      );
    }

    const total = await Rider.countDocuments(query);

    const formatted = riders.map((r) => ({
      id: r._id,
      name: r.user?.name || "N/A",
      email: r.user?.email || "N/A",
      phone: r.user?.phoneNumber || r.phoneNumber || "N/A",
      profileImage: r.user?.profileImage || null,
      city: r.user?.city || r.city || "N/A",
      country: r.user?.country || "N/A",
      status: r.status,
      isVerified: r.isVerified,
      verificationStatus: r.verificationStatus,
      rating: r.rating || 5,
      totalRides: r.totalRides || 0,
      totalEarning: r.totalEarning || 0,
      walletBalance: r.walletBalance || 0,
      vehicle: {
        category: r.vehicleDetails?.category || "N/A",
        type: r.vehicleDetails?.vehicleType || "N/A",
        make: r.vehicleDetails?.make || "N/A",
        model: r.vehicleDetails?.model || "N/A",
        year: r.vehicleDetails?.year || "N/A",
        color: r.vehicleDetails?.color || "N/A",
        licensePlate: r.vehicleDetails?.licensePlate || "N/A",
      },
      documents: {
        license: r.documents?.license?.status || "N/A",
        insurance: r.documents?.insurance?.status || "N/A",
        profilePhoto: r.documents?.profilePhoto?.status || "N/A",
        vehicleRegistration: r.documents?.vehicleRegistration?.status || "N/A",
      },
      joinedAt: r.createdAt,
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: formatted,
    });
  } catch (error) {
    console.error("getAllDrivers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getDriverById = async (req, res) => {
  try {
    const driver = await Rider.findById(req.params.id)
      .populate("user", "name email phoneNumber profileImage city country createdAt")
      .lean();

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: driver._id,
        name: driver.user?.name || "N/A",
        email: driver.user?.email || "N/A",
        phone: driver.user?.phoneNumber || driver.phoneNumber || "N/A",
        profileImage: driver.user?.profileImage || null,
        city: driver.user?.city || driver.city || "N/A",
        status: driver.status,
        isVerified: driver.isVerified,
        verificationStatus: driver.verificationStatus,
        rating: driver.rating || 5,
        totalRides: driver.totalRides || 0,
        totalEarning: driver.totalEarning || 0,
        walletBalance: driver.walletBalance || 0,
        vehicle: driver.vehicleDetails || {},
        documents: driver.documents || {},
        bankAccount: driver.bankAccount || {},
        emergencyContact: driver.emergencyContact || {},
        address: driver.address || "N/A",
        adminNotes: driver.adminNotes || null,
        joinedAt: driver.createdAt,
      },
    });
  } catch (error) {
    console.error("getDriverById error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true },
    ).populate("user", "name email");

    res.status(200).json({
      success: true,
      message: "Driver updated successfully",
      data: driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteDriver = async (req, res) => {
  try {
    await Driver.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Driver deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getPendingDrivers = async (req, res) => {
  try {
    console.log('Getting pending drivers...');
    
    const pendingDrivers = await Rider.find({
      verificationStatus: "pending",
      isVerified: false,
    }).populate("user", "name email phoneNumber profileImage");

    console.log(`Found ${pendingDrivers.length} pending drivers`);

    res.status(200).json({
      success: true,
      count: pendingDrivers.length,
      data: pendingDrivers,
    });
  } catch (error) {
    console.error('Get pending drivers error:', error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

exports.verifyDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    driver.isVerified = true;
    driver.verificationStatus = "approved";
    driver.status = "active";
    driver.verifiedAt = new Date();
    await driver.save();

    res.status(200).json({
      success: true,
      message: "Driver verified successfully",
      data: driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.rejectDriver = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    driver.isVerified = false;
    driver.verificationStatus = "rejected";
    driver.status = "inactive";
    driver.rejectionReason = rejectionReason;
    await driver.save();

    res.status(200).json({
      success: true,
      message: "Driver rejected",
      data: driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 5. ROLE MANAGEMENT APIS
// ============================================

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find({});
    res.status(200).json({
      success: true,
      data: roles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const role = await Role.create({ name, permissions });
    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    await Role.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 6. PERMISSIONS APIS
// ============================================

exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find({});
    res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.createPermission = async (req, res) => {
  try {
    const { name, description, module, action } = req.body;
    const permission = await Permission.create({
      name,
      description,
      module,
      action,
    });
    res.status(201).json({
      success: true,
      message: "Permission created successfully",
      data: permission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updatePermission = async (req, res) => {
  try {
    const permission = await Permission.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    res.status(200).json({
      success: true,
      message: "Permission updated successfully",
      data: permission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deletePermission = async (req, res) => {
  try {
    await Permission.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Permission deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 7. CAB MANAGEMENT APIS
// ============================================

exports.getAllCabs = async (req, res) => {
  try {
    const cabs = await Driver.find(
      { "vehicleDetails.licensePlate": { $exists: true, $ne: null } },
      "vehicleDetails user",
    ).populate("user", "name email phoneNumber");

    res.status(200).json({
      success: true,
      data: cabs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.addCab = async (req, res) => {
  try {
    const { driverId, vehicleDetails } = req.body;
    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { vehicleDetails },
      { new: true },
    );
    res.status(201).json({
      success: true,
      message: "Cab added successfully",
      data: driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateCab = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { vehicleDetails: req.body },
      { new: true },
    );
    res.status(200).json({
      success: true,
      message: "Cab updated successfully",
      data: driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteCab = async (req, res) => {
  try {
    await Driver.findByIdAndUpdate(req.params.id, { vehicleDetails: null });
    res.status(200).json({
      success: true,
      message: "Cab deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 8. REFERRAL & EARNINGS APIS
// ============================================

exports.getReferralEarnings = async (req, res) => {
  try {
    const earnings = await User.find(
      {},
      "name email referralCount walletBalance totalEarnedFromReferrals referralCode",
    ).sort({ totalEarnedFromReferrals: -1 });

    res.status(200).json({
      success: true,
      data: earnings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getReferralEarningsByUser = async (req, res) => {
  try {
    const user = await User.findById(
      req.params.userId,
      "name email referralCount walletBalance totalEarnedFromReferrals referralCode referredBy",
    ).populate("referredBy", "name email");

    const referrals = await User.find(
      { referredBy: req.params.userId },
      "name email createdAt",
    );

    res.status(200).json({
      success: true,
      data: {
        user,
        referrals,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getAllReferrals = async (req, res) => {
  try {
    const referrals = await User.find(
      { referredBy: { $ne: null } },
      "name email referredBy createdAt",
    ).populate("referredBy", "name email referralCode");

    res.status(200).json({
      success: true,
      data: referrals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getReferralsByUser = async (req, res) => {
  try {
    const referrals = await User.find({ referredBy: req.params.userId });
    res.status(200).json({
      success: true,
      data: referrals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 9. PROMOTIONS APIS
// ============================================

exports.getAllPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: promotions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.createPromotion = async (req, res) => {
  try {
    const { code, discountType, discountValue, validUntil, usageLimit } =
      req.body;
    const promotion = await Promotion.create({
      code,
      discountType,
      discountValue,
      validUntil,
      usageLimit,
      isActive: true,
    });
    res.status(201).json({
      success: true,
      message: "Promotion created successfully",
      data: promotion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    res.status(200).json({
      success: true,
      message: "Promotion updated successfully",
      data: promotion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    await Promotion.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Promotion deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 10. RIDE MANAGEMENT APIS
// ============================================

exports.getAllRides = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "" } = req.query;
    const query = status ? { status } : {};

    const rides = await Booking.find(query)
      .populate("user", "name email phoneNumber")
      .populate("driver", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: rides,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getRideById = async (req, res) => {
  try {
    const ride = await Booking.findById(req.params.id)
      .populate("user", "name email phoneNumber")
      .populate("driver", "name email phoneNumber vehicleDetails");

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }
    res.status(200).json({
      success: true,
      data: ride,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateRideStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    res.status(200).json({
      success: true,
      message: "Ride status updated successfully",
      data: ride,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteRide = async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Ride deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 11. DRIVER VERIFICATIONS APIS
// ============================================

exports.getDriverVerifications = async (req, res) => {
  try {
    console.log('Getting driver verifications...');
    
    const verifications = await Rider.find({
      verificationStatus: { $in: ["pending", "in_review"] },
    })
      .populate("user", "name email phoneNumber profileImage")
      .lean();

    console.log(`Found ${verifications.length} verifications`);

    res.status(200).json({
      success: true,
      count: verifications.length,
      data: verifications,
    });
  } catch (error) {
    console.error('Get driver verifications error:', error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

exports.getPendingVerifications = async (req, res) => {
  try {
    const pending = await Rider.find({
      verificationStatus: "pending",
      isVerified: false,
    })
      .populate("user", "name email phoneNumber profileImage")
      .lean();

    res.status(200).json({
      success: true,
      data: pending,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getVerificationById = async (req, res) => {
  try {
    const verification = await Rider.findById(req.params.id)
      .populate("user", "name email phoneNumber profileImage")
      .lean();

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
      });
    }
    res.status(200).json({
      success: true,
      data: verification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.approveVerification = async (req, res) => {
  try {
    console.log('Approving verification for rider ID:', req.params.id);
    
    const rider = await Rider.findById(req.params.id);
    if (!rider) {
      console.log('Rider not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    console.log('Rider found, current status:', {
      isVerified: rider.isVerified,
      verificationStatus: rider.verificationStatus,
      status: rider.status
    });

    // Approve all documents
    if (rider.documents?.license) rider.documents.license.status = "approved";
    if (rider.documents?.insurance)
      rider.documents.insurance.status = "approved";
    if (rider.documents?.profilePhoto)
      rider.documents.profilePhoto.status = "approved";
    if (rider.documents?.vehicleRegistration)
      rider.documents.vehicleRegistration.status = "approved";

    // Update rider verification status
    rider.isVerified = true;
    rider.verificationStatus = "approved";
    rider.status = "available";
    rider.verifiedAt = new Date();
    
    const savedRider = await rider.save();
    console.log('Rider approved successfully, new status:', {
      isVerified: savedRider.isVerified,
      verificationStatus: savedRider.verificationStatus,
      status: savedRider.status
    });

    res.status(200).json({
      success: true,
      message: "Rider verification approved successfully",
      data: savedRider,
    });
  } catch (error) {
    console.error('Approve verification error:', error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.rejectVerification = async (req, res) => {
  try {
    console.log('Rejecting verification for rider ID:', req.params.id);
    
    const { rejectionReason, rejectedDocument } = req.body;
    const rider = await Rider.findById(req.params.id);

    if (!rider) {
      console.log('Rider not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    console.log('Rider found, rejecting with reason:', rejectionReason);

    // Reject specific document if provided
    if (rejectedDocument && rider.documents[rejectedDocument]) {
      rider.documents[rejectedDocument].status = "rejected";
      rider.documents[rejectedDocument].rejectionReason = rejectionReason;
    }

    // Update rider verification status
    rider.isVerified = false;
    rider.verificationStatus = "rejected";
    rider.status = "inactive";
    rider.rejectionReason = rejectionReason;
    
    const savedRider = await rider.save();
    console.log('Rider rejected successfully');

    res.status(200).json({
      success: true,
      message: "Rider verification rejected",
      data: savedRider,
    });
  } catch (error) {
    console.error('Reject verification error:', error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// 12. RECENT ACTIVITY APIS
// ============================================

exports.getRecentActivities = async (req, res) => {
  try {
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    const recentRides = await Booking.find().sort({ createdAt: -1 }).limit(5);
    const recentDrivers = await Driver.find().sort({ createdAt: -1 }).limit(5);

    const activities = [];

    recentUsers.forEach((user) => {
      activities.push({
        type: "user",
        message: `${user.name} joined the platform`,
        time: user.createdAt,
        icon: "user-plus",
        color: "green",
      });
    });

    recentRides.forEach((ride) => {
      activities.push({
        type: "ride",
        message: `Ride #${ride._id.toString().slice(-6)} completed successfully`,
        time: ride.createdAt,
        icon: "car",
        color: "blue",
      });
    });

    recentDrivers.forEach((driver) => {
      activities.push({
        type: "driver",
        message: `New driver verification pending`,
        time: driver.createdAt,
        icon: "driver",
        color: "orange",
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.status(200).json({
      success: true,
      data: activities.slice(0, 10),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 13. ANALYTICS APIS
// ============================================

exports.getAnalyticsOverview = async (req, res) => {
  try {
    const totalRevenue = await Booking.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$fare" } } },
    ]);

    const totalRides = await Booking.countDocuments();
    const avgRating = await Driver.aggregate([
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]);

    const monthlyRides = await Booking.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalRides,
        averageRating: avgRating[0]?.avg || 5,
        monthlyRides,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = "monthly" } = req.query;
    let groupBy;

    if (period === "daily") groupBy = { $dayOfMonth: "$createdAt" };
    else if (period === "monthly") groupBy = { $month: "$createdAt" };
    else groupBy = { $year: "$createdAt" };

    const revenue = await Booking.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: groupBy,
          total: { $sum: "$fare" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: revenue,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getRideAnalytics = async (req, res) => {
  try {
    const ridesByStatus = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const ridesByHour = await Booking.aggregate([
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: ridesByStatus,
        byHour: ridesByHour,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 14. SETTINGS APIS
// ============================================

exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        appName: "RideLynk",
        appVersion: "1.0.0",
        features: {},
      });
    }
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
    });
    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 15. PROFILE APIS
// ============================================

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select("-password");
    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateAdminProfile = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;
    const admin = await Admin.findByIdAndUpdate(
      req.admin._id,
      { name, email, phoneNumber },
      { new: true },
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id).select("+password");

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 16. ADMIN MANAGEMENT APIS
// ============================================

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).select("-password");
    res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, role, permissions } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role: role || "admin",
      permissions: permissions || {},
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { name, email, phoneNumber, role } = req.body;
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { name, email, phoneNumber, role },
      { new: true },
    ).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (admin.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot delete super admin",
      });
    }

    await Admin.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.toggleAdminStatus = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (admin.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot modify super admin status",
      });
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    res.status(200).json({
      success: true,
      message: `Admin ${admin.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        _id: admin._id,
        name: admin.name,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateAdminPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (admin.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot modify super admin permissions",
      });
    }

    admin.permissions = permissions;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Permissions updated successfully",
      data: {
        _id: admin._id,
        name: admin.name,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// module.exports = {
//   adminLogin,
//   adminRegister,
//   adminLogout,
//   forgotPassword,
//   resetPassword,
//   refreshToken,

//   getDashboardStats,
//   getDashboardChartData,
//   getRideStatusStats,

//   getAllUsers,
//   getUserById,
//   updateUser,
//   deleteUser,
//   blockUser,
//   unblockUser,

//   getAllDrivers,
//   getDriverById,
//   updateDriver,
//   deleteDriver,
//   getPendingDrivers,
//   verifyDriver,
//   rejectDriver,

//   getAllRoles,
//   createRole,
//   updateRole,
//   deleteRole,

//   getAllPermissions,
//   createPermission,
//   updatePermission,
//   deletePermission,

//   getAllCabs,
//   addCab,
//   updateCab,
//   deleteCab,

//   getReferralEarnings,
//   getReferralEarningsByUser,
//   getAllReferrals,
//   getReferralsByUser,

//   getAllPromotions,
//   createPromotion,
//   updatePromotion,
//   deletePromotion,

//   getAllRides,
//   getRideById,
//   updateRideStatus,
//   deleteRide,

//   getDriverVerifications,
//   getPendingVerifications,
//   getVerificationById,
// ============================================
// STRIPE CONNECT ADMIN MANAGEMENT
// ============================================

// Get all drivers with Connect account status
exports.getDriverConnectAccounts = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    let filter = {};
    if (status && status !== 'all') {
      filter.connectAccountStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const riders = await Rider.find(filter)
      .populate('user', 'name email phoneNumber')
      .select('stripeConnectAccountId connectAccountStatus connectOnboardingComplete connectChargesEnabled connectPayoutsEnabled connectAccountCreatedAt totalEarning')
      .sort({ connectAccountCreatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rider.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: riders.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      riders
    });
  } catch (error) {
    console.error('Get driver Connect accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve driver Connect accounts',
      error: error.message
    });
  }
};

// Get specific driver's Connect account details
exports.getDriverConnectDetails = async (req, res) => {
  try {
    const { riderId } = req.params;

    const rider = await Rider.findById(riderId).populate('user', 'name email phoneNumber');

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found'
      });
    }

    if (!rider.stripeConnectAccountId) {
      return res.status(200).json({
        success: true,
        message: 'No Connect account found',
        rider: {
          _id: rider._id,
          user: rider.user,
          connectAccountStatus: 'not_started',
          stripeAccount: null
        }
      });
    }

    const account = await stripe.accounts.retrieve(rider.stripeConnectAccountId);

    res.status(200).json({
      success: true,
      rider: {
        _id: rider._id,
        user: rider.user,
        stripeConnectAccountId: rider.stripeConnectAccountId,
        connectAccountStatus: rider.connectAccountStatus,
        connectOnboardingComplete: rider.connectOnboardingComplete,
        connectChargesEnabled: rider.connectChargesEnabled,
        connectPayoutsEnabled: rider.connectPayoutsEnabled,
        connectAccountCreatedAt: rider.connectAccountCreatedAt,
        totalEarning: rider.totalEarning
      },
      stripeAccount: {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirementsCurrentlyDue: account.requirements?.currently_due || [],
        requirementsEventuallyDue: account.requirements?.eventually_due || [],
        requirementsPastDue: account.requirements?.past_due || [],
        payoutSchedule: account.settings?.payouts?.schedule || null
      }
    });
  } catch (error) {
    console.error('Get driver Connect details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve driver Connect details',
      error: error.message
    });
  }
};

// Generate onboarding link for driver (admin action)
exports.generateDriverOnboardingLink = async (req, res) => {
  try {
    const { riderId } = req.params;

    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found'
      });
    }

    if (!rider.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        message: 'No Connect account found for this driver'
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: rider.stripeConnectAccountId,
      refresh_url: process.env.CONNECT_REFRESH_URL,
      return_url: process.env.CONNECT_RETURN_URL,
      type: 'account_onboarding',
    });

    res.status(200).json({
      success: true,
      message: 'Onboarding link generated for driver',
      url: accountLink.url
    });
  } catch (error) {
    console.error('Generate driver onboarding link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate onboarding link',
      error: error.message
    });
  }
};

// Disconnect driver's Connect account (admin action)
exports.disconnectDriverAccount = async (req, res) => {
  try {
    const { riderId } = req.params;

    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found'
      });
    }

    if (!rider.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        message: 'No Connect account found for this driver'
      });
    }

    rider.connectAccountStatus = 'disabled';
    rider.connectChargesEnabled = false;
    rider.connectPayoutsEnabled = false;
    await rider.save();

    res.status(200).json({
      success: true,
      message: 'Driver Connect account disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect driver account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect driver account',
      error: error.message
    });
  }
};

// ============================================
// 16. CATEGORIES MANAGEMENT APIS
// ============================================

exports.getAllCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = search ? { categoryDisplayName: { $regex: search, $options: "i" } } : {};

    const categories = await RideType.find(query)
      .sort({ order: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await RideType.countDocuments(query);

    res.status(200).json({
      success: true,
      data: categories,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { category, categoryDisplayName, categoryDescription, capacity, icon, order } = req.body;
    const rideType = await RideType.create({
      category,
      categoryDisplayName,
      categoryDescription,
      capacity,
      icon,
      order,
      isActive: true,
    });
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: rideType,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const rideType = await RideType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: rideType,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await RideType.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

//   approveVerification,
//   rejectVerification,

//   getRecentActivities,

//   getAnalyticsOverview,
//   getRevenueAnalytics,
//   getRideAnalytics,

//   getSettings,
//   updateSettings,

//   getAdminProfile,
//   updateAdminProfile,
//   changePassword,

//   getAllAdmins,
//   getAdminById,
//   createAdmin,
//   updateAdmin,
//   deleteAdmin,
//   toggleAdminStatus,
//   updateAdminPermissions,
// };
