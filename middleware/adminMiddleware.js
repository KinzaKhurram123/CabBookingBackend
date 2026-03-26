const User = require("../models/user");

const adminProtect = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no user found",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error in admin middleware",
      error: error.message,
    });
  }
};

module.exports = { adminProtect };
