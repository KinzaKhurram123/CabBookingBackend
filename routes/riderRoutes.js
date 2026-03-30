const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminProtect } = require("../middleware/adminMiddleware");
const {
  addVehicleDetails,
  uploadLicense,
  uploadInsurance,
  uploadProfilePhoto,
  acceptTerms,
  submitForVerification,
  getOnboardingStatus,
  updateRiderProfile,
  getPendingVerifications,
  approveRider,
  rejectRider,
} = require("../controllers/riderController");

router.post("/onboarding/vehicle", protect, addVehicleDetails);
router.post("/onboarding/license", protect, uploadLicense);
router.post("/onboarding/insurance", protect, uploadInsurance);
router.post("/onboarding/profile_photo", protect, uploadProfilePhoto);
router.post("/onboarding/accept-terms", protect, acceptTerms);
router.post("/onboarding/submit", protect, submitForVerification);
router.get("/onboarding/status", protect, getOnboardingStatus);

router.put("/profile", protect, updateRiderProfile);

router.get("/admin/pending", protect, adminProtect, getPendingVerifications);
router.put("/admin/approve/:riderId", protect, adminProtect, approveRider);
router.put("/admin/reject/:riderId", protect, adminProtect, rejectRider);

module.exports = router;
