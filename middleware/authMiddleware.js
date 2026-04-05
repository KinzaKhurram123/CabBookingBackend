const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.protect = async (req, res, next) => {
  let token;

  console.log("=== AUTH DEBUG ===");
  console.log("Authorization header:", req.headers.authorization);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    console.log("Token extracted:", token);
    console.log("Token length:", token.length);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);

      const user = await User.findById(decoded.id).select("-password");
      console.log("User found:", user ? user._id : "No user found");

      if (!user) {
        console.log("User not found in database");
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Token verification error:", error.message);
      console.error("Error name:", error.name);

      if (error.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ success: false, message: "Invalid token" });
      }
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ success: false, message: "Token expired" });
      }
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }
  } else {
    console.log("No authorization header or invalid format");
    console.log("Headers received:", req.headers);
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route. Required roles: ${roles.join(", ")}`,
      });
    }
    next();
  };
};

exports.isActive = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  if (!req.user.isActive) {
    return res.status(403).json({
      success: false,
      message: "Your account is deactivated. Please contact support.",
    });
  }

  next();
};

exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

exports.verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    return user;
  } catch (error) {
    return null;
  }
};
