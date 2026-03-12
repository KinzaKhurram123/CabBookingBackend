const express = require("express");
const router = express.Router();
const {
  updateRiderProfile,
  updateRiderLocation,
} = require("../controllers/riderController");
const protect = require("../middleware/authMiddleware");

router.post("/riderprofile", protect, updateRiderProfile);
router.post("/update_location", protect, updateRiderLocation);
module.exports = router;
