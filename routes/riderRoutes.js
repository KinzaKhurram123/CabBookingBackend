const express = require("express");
const router = express.Router();
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
  upload,
} = require("../controllers/riderController");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  protectAdmin,
  superAdminOnly,
  checkPermission,
} = require("../middleware/adminMiddleware");

router.use(protect);

router.post("/vehicle-details", addVehicleDetails);

router.post(
  "/upload-license",
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
  ]),
  uploadLicense,
);

router.post("/upload-insurance", upload.single("insurance"), uploadInsurance);

router.post(
  "/upload-profile-photo",
  upload.single("profilePhoto"),
  uploadProfilePhoto,
);

router.post("/accept-terms", acceptTerms);

router.post("/submit-verification", submitForVerification);

router.get("/onboarding-status", getOnboardingStatus);

router.put("/profile", updateRiderProfile);

router.get(
  "/admin/pending-verifications",
  protectAdmin,
  checkPermission("manageRiders"),
  getPendingVerifications,
);

router.put(
  "/admin/approve-rider/:riderId",
  protectAdmin,
  checkPermission("manageRiders"),
  approveRider,
);

router.put(
  "/admin/reject-rider/:riderId",
  protectAdmin,
  checkPermission("manageRiders"),
  rejectRider,
);

module.exports = router;
