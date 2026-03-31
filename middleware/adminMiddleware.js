const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");

exports.protectAdmin = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token && req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route. Please login first.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found. Invalid token.",
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message:
          "Your account has been deactivated. Please contact super admin.",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Admin auth error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
      error: error.message,
    });
  }
};

exports.superAdminOnly = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  if (req.admin.role === "super_admin") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Access denied. This action requires super admin privileges.",
    });
  }
};

exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (req.admin.role === "super_admin") {
      return next();
    }

    if (req.admin.permissions && req.admin.permissions[permission] === true) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. You don't have ${permission} permission.`,
      requiredPermission: permission,
      yourPermissions: req.admin.permissions,
    });
  };
};

exports.checkPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (req.admin.role === "super_admin") {
      return next();
    }

    const hasPermission = permissions.some(
      (permission) =>
        req.admin.permissions && req.admin.permissions[permission] === true,
    );

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. You need one of these permissions: ${permissions.join(", ")}`,
      requiredPermissions: permissions,
      yourPermissions: req.admin.permissions,
    });
  };
};

exports.isActive = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  if (!req.admin.isActive) {
    return res.status(403).json({
      success: false,
      message: "Your account is deactivated. Please contact administrator.",
    });
  }

  next();
};

exports.generateToken = (id) => {
  return jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

exports.verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select("-password");
    return admin;
  } catch (error) {
    return null;
  }
};
