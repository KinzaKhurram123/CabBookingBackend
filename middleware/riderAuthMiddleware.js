const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Rider = require("../models/riderModel");

const riderProtect = async (req, res, next) => {
  try {
    console.log("=== RIDER PROTECT MIDDLEWARE ===");
    console.log("Request path:", req.path);
    console.log("Request method:", req.method);

    let userId = req.user?._id || req.user?.id;

    if (!userId) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer")) {
        return res.status(401).json({
          success: false,
          message: "Not authorized. Please login first.",
        });
      }

      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;

        // Set req.user so downstream code works
        const user = await User.findById(userId).select("-password");
        if (!user) {
          return res.status(401).json({
            success: false,
            message: "User not found.",
          });
        }
        req.user = user;
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token.",
        });
      }
    }

    console.log("User ID extracted:", userId);

    const rider = await Rider.findOne({ user: userId });

    console.log("Rider found:", rider ? "Yes" : "No");
    console.log("Rider ID:", rider?._id);
    console.log("Rider status:", rider?.status);
    console.log("Rider isVerified:", rider?.isVerified);
    console.log("Rider verificationStatus:", rider?.verificationStatus);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider profile not found. Please complete your registration.",
        requiresRegistration: true,
      });
    }

    // Allow Stripe Connect endpoints even if not verified
    // Riders can set up their payment account while waiting for verification
    const stripeConnectPaths = ['/create-account', '/account-link', '/account-status', '/refresh-link', '/dashboard-link'];
    const isStripeConnectEndpoint = stripeConnectPaths.some(path => req.path.includes(path));

    if (!rider.isVerified && !isStripeConnectEndpoint) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is not verified yet. Please wait for admin approval.",
        verificationStatus: rider.verificationStatus,
      });
    }

    req.rider = rider;
    console.log("✅ Rider middleware passed, proceeding to controller");
    next();
  } catch (error) {
    console.error("Rider protect error:", error);
    res.status(500).json({
      success: false,
      message: "Server error in rider authentication",
      error: error.message,
    });
  }
};

module.exports = { riderProtect };
