// middleware/riderAuthMiddleware.js
const Rider = require("../models/riderModel");

const riderProtect = async (req, res, next) => {
  try {
    console.log("=== RIDER PROTECT MIDDLEWARE ===");
    console.log("req.user:", req.user);

    // ✅ Try multiple ways to get user ID
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    console.log("User ID extracted:", userId);

    if (!userId) {
      console.log("No user ID found in request");
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found. Please login again.",
      });
    }

    // Find rider by user ID
    const rider = await Rider.findOne({ user: userId });

    console.log("Rider found:", rider ? "Yes" : "No");
    console.log("Rider ID:", rider?._id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider profile not found. Please complete your registration.",
      });
    }

    // Attach rider to request
    req.rider = rider;
    next();
  } catch (error) {
    console.error("Rider protect error:", error);
    res.status(500).json({
      success: false,
      message: "Server error in rider authentication",
    });
  }
};

module.exports = { riderProtect };
