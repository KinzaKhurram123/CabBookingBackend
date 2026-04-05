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
  updateRiderStatus,
  addCompleteVehicleDetails,
  upload,
} = require("../controllers/riderController");
const { protect } = require("../middleware/authMiddleware");
const { riderProtect } = require("../middleware/riderAuthMiddleware");

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

router.post(
  "/add-complete-vehicle-details",
  protect,
  upload.fields([
    { name: "vehiclePhoto", maxCount: 1 },
    { name: "registrationDocument", maxCount: 1 },
  ]),
  addCompleteVehicleDetails,
);

router.post("/accept-terms", acceptTerms);

router.post("/submit-verification", submitForVerification);

router.get("/onboarding-status", getOnboardingStatus);

router.put("/profile", updateRiderProfile);

router.put("/status", riderProtect, updateRiderStatus);

module.exports = router;
