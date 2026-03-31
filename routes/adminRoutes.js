const express = require("express");
const router = express.Router();
const {
  adminLogin,
  createAdmin,
  getAllAdmins,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPermissions,
  toggleAdminStatus,
  deleteAdmin,
  changePassword,
  getDashboardStats,
} = require("../controllers/adminController");
const {
  protectAdmin,
  superAdminOnly,
  checkPermission,
  checkPermissions,
  isActive,
} = require("../middleware/adminMiddleware");

router.post("/login", adminLogin);

router.use(protectAdmin);
router.use(isActive);

router.get("/profile", getAdminProfile);
router.put("/profile", updateAdminProfile);
router.put("/change-password", changePassword);

router.get(
  "/dashboard-stats",
  checkPermission("viewReports"),
  getDashboardStats,
);

router.post("/create", superAdminOnly, createAdmin);
router.get("/all", superAdminOnly, getAllAdmins);
router.put("/permissions/:id", superAdminOnly, updateAdminPermissions);
router.put("/toggle-status/:id", superAdminOnly, toggleAdminStatus);
router.delete("/:id", superAdminOnly, deleteAdmin);

router.get(
  "/users",
  checkPermissions(["manageRiders", "manageDrivers"]),
  (req, res) => {
    res.json({ message: "You have permission to view users" });
  },
);

module.exports = router;
