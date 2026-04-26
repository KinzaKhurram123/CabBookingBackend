const express = require("express");
const router = express.Router();
const {
  getRideTypes,
  getAllRideTypesAdmin,
  getRideTypeById,
  createRideType,
  updateRideType,
  deleteRideType,
  toggleRideTypeStatus,
} = require("../controllers/rideTypeControllers");
const { protectAdmin } = require("../middleware/adminMiddleware");

// Public route - User facing
router.get("/ride-types", getRideTypes);

// Admin routes
router.get("/admin/ride-types", protectAdmin, getAllRideTypesAdmin);
router.get("/admin/ride-types/:id", protectAdmin, getRideTypeById);
router.post("/admin/ride-types", protectAdmin, createRideType);
router.put("/admin/ride-types/:id", protectAdmin, updateRideType);
router.delete("/admin/ride-types/:id", protectAdmin, deleteRideType);
router.patch("/admin/ride-types/:id/toggle", protectAdmin, toggleRideTypeStatus);

module.exports = router;
