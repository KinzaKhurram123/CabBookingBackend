const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  // ===== AUTHENTICATION =====
  adminLogin,
  adminRegister,
  adminLogout,
  forgotPassword,
  resetPassword,
  refreshToken,

  // ===== DASHBOARD =====
  getDashboardStats,
  getDashboardChartData,
  getRideStatusStats,

  // ===== USER MANAGEMENT =====
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,

  // ===== DRIVER MANAGEMENT =====
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  getPendingDrivers,
  verifyDriver,
  rejectDriver,

  // ===== ROLE MANAGEMENT =====
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,

  // ===== PERMISSIONS =====
  getAllPermissions,
  createPermission,
  updatePermission,
  deletePermission,

  // ===== CAB MANAGEMENT =====
  getAllCabs,
  addCab,
  updateCab,
  deleteCab,

  // ===== REFERRAL & EARNINGS =====
  getReferralEarnings,
  getReferralEarningsByUser,
  getAllReferrals,
  getReferralsByUser,

  // ===== PROMOTIONS =====
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,

  // ===== RIDE MANAGEMENT =====
  getAllRides,
  getRideById,
  updateRideStatus,
  deleteRide,

  // ===== DRIVER VERIFICATIONS =====
  getDriverVerifications,
  getPendingVerifications,
  getVerificationById,
  approveVerification,
  rejectVerification,

  // ===== RECENT ACTIVITY =====
  getRecentActivities,

  // ===== ANALYTICS =====
  getAnalyticsOverview,
  getRevenueAnalytics,
  getRideAnalytics,

  // ===== SETTINGS =====
  getSettings,
  updateSettings,

  // ===== ADMIN PROFILE =====
  getAdminProfile,
  updateAdminProfile,
  changePassword,

  // ===== ADMIN MANAGEMENT =====
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  toggleAdminStatus,
  updateAdminPermissions,
} = require("../controllers/adminController");

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

// Auth routes
router.post("/login", adminLogin);
router.post("/register", adminRegister);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshToken);

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================
router.use(protect);
router.use(authorize("admin"));

// ===== AUTH =====
router.post("/logout", adminLogout);

// ===== ADMIN PROFILE =====
router.get("/profile", getAdminProfile);
router.put("/profile", updateAdminProfile);
router.post("/change-password", changePassword);

// ===== ADMIN MANAGEMENT (Super Admin Only) =====
router.get("/admins", getAllAdmins);
router.get("/admins/:id", getAdminById);
router.post("/admins", createAdmin);
router.put("/admins/:id", updateAdmin);
router.delete("/admins/:id", deleteAdmin);
router.post("/admins/:id/toggle-status", toggleAdminStatus);
router.put("/admins/:id/permissions", updateAdminPermissions);

// ===== DASHBOARD =====
router.get("/dashboard/stats", getDashboardStats);
router.get("/dashboard/chart-data", getDashboardChartData);
router.get("/dashboard/ride-status", getRideStatusStats);

// ===== USER MANAGEMENT =====
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.post("/users/:id/block", blockUser);
router.post("/users/:id/unblock", unblockUser);

// ===== DRIVER MANAGEMENT =====
router.get("/drivers", getAllDrivers);
router.get("/drivers/pending", getPendingDrivers);
router.get("/drivers/:id", getDriverById);
router.put("/drivers/:id", updateDriver);
router.delete("/drivers/:id", deleteDriver);
router.post("/drivers/:id/verify", verifyDriver);
router.post("/drivers/:id/reject", rejectDriver);

// ===== ROLE MANAGEMENT =====
router.get("/roles", getAllRoles);
router.post("/roles", createRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

// ===== PERMISSIONS =====
router.get("/permissions", getAllPermissions);
router.post("/permissions", createPermission);
router.put("/permissions/:id", updatePermission);
router.delete("/permissions/:id", deletePermission);

// ===== CAB MANAGEMENT =====
router.get("/cabs", getAllCabs);
router.post("/cabs", addCab);
router.put("/cabs/:id", updateCab);
router.delete("/cabs/:id", deleteCab);

// ===== REFERRAL & EARNINGS =====
router.get("/referral/earnings", getReferralEarnings);
router.get("/referral/earnings/:userId", getReferralEarningsByUser);
router.get("/referrals", getAllReferrals);
router.get("/referrals/:userId", getReferralsByUser);

// ===== PROMOTIONS =====
router.get("/promotions", getAllPromotions);
router.post("/promotions", createPromotion);
router.put("/promotions/:id", updatePromotion);
router.delete("/promotions/:id", deletePromotion);

// ===== RIDE MANAGEMENT =====
router.get("/rides", getAllRides);
router.get("/rides/:id", getRideById);
router.put("/rides/:id/status", updateRideStatus);
router.delete("/rides/:id", deleteRide);

// ===== DRIVER VERIFICATIONS =====
router.get("/driver-verifications", getDriverVerifications);
router.get("/driver-verifications/pending", getPendingVerifications);
router.get("/driver-verifications/:id", getVerificationById);
router.post("/driver-verifications/:id/approve", approveVerification);
router.post("/driver-verifications/:id/reject", rejectVerification);

// ===== RECENT ACTIVITY =====
router.get("/recent-activities", getRecentActivities);

// ===== ANALYTICS =====
router.get("/analytics/overview", getAnalyticsOverview);
router.get("/analytics/revenue", getRevenueAnalytics);
router.get("/analytics/rides", getRideAnalytics);

// ===== SETTINGS =====
router.get("/settings", getSettings);
router.put("/settings", updateSettings);

module.exports = router;
