const Admin = require("../models/admin");
const User = require("../models/user");
const Rider = require("../models/riderModel");
const Driver = require("../models/driverModel");
const Booking = require("../models/rideBooking");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

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
        message: "Account is deactivated. Please contact super admin.",
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
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, role, permissions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role: role || "admin",
      permissions: permissions || {
        manageRiders: true,
        manageDrivers: true,
        manageUsers: true,
        managePayments: true,
        viewReports: true,
      },
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
        permissions: newAdmin.permissions,
        isActive: newAdmin.isActive,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).select("-password");

    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    console.error("Get all admins error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select("-password");

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
    console.error("Get admin profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.updateAdminProfile = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.admin._id,
      {
        $set: {
          name: name || req.admin.name,
          email: email || req.admin.email,
          phoneNumber: phoneNumber || req.admin.phoneNumber,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true },
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    console.error("Update admin profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const admin = await Admin.findById(req.admin._id).select("+password");

    const isPasswordMatch = await bcrypt.compare(
      currentPassword,
      admin.password,
    );

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.updateAdminPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const admin = await Admin.findById(id);

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
    admin.updatedAt = new Date();
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
    console.error("Update permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (admin.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot deactivate super admin",
      });
    }

    admin.isActive = !admin.isActive;
    admin.updatedAt = new Date();
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
    console.error("Toggle admin status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);

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

    await Admin.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    // Get all counts
    const [
      totalUsers,
      totalRiders,
      totalDrivers,
      totalBookings,
      completedBookings,
      pendingBookings,
      cancelledBookings,
      totalRevenue,
      pendingVerifications,
      recentBookings,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      Rider.countDocuments(),
      Driver.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "completed" }),
      Booking.countDocuments({ status: "pending" }),
      Booking.countDocuments({ status: "cancelled" }),
      Booking.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$fare" } } },
      ]),
      Rider.countDocuments({
        verificationStatus: "in_review",
        isVerified: false,
      }),
      Booking.find().sort({ createdAt: -1 }).limit(10).populate("user", "name"),
      User.find().sort({ createdAt: -1 }).limit(10).select("-password"),
    ]);

    const stats = {
      users: {
        total: totalUsers,
        riders: totalRiders,
        drivers: totalDrivers,
      },
      bookings: {
        total: totalBookings,
        completed: completedBookings,
        pending: pendingBookings,
        cancelled: cancelledBookings,
      },
      revenue: totalRevenue[0]?.total || 0,
      pendingVerifications,
      recentBookings,
      recentUsers,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
