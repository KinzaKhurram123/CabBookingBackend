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
  getRiderBookingHistory,
  requestAccountDeletion,
  cancelAccountDeletion,
  upload,
} = require("../controllers/riderController");
const {
  setupPaymentMethod,
  getUserCards,
  setDefaultCard,
  removeCard,
  getPaymentStatus,
  confirmPaymentMethod,
} = require("../controllers/paymentController");
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

router.get("/booking-history", riderProtect, getRiderBookingHistory);

// Account deletion
router.delete("/account", riderProtect, requestAccountDeletion);       // request deletion (deactivates immediately, deletes after 3 days)
router.post("/account/restore", riderProtect, cancelAccountDeletion);  // cancel deletion & restore account

// Payment routes
router.post("/payment/setup", setupPaymentMethod);
router.post("/payment/confirm", confirmPaymentMethod);
router.get("/payment/cards", getUserCards);
router.put("/payment/cards/default", setDefaultCard);
router.put("/payment/default-card", setDefaultCard);
router.delete("/payment/cards/remove/:paymentMethodId", removeCard);
router.delete("/payment/card/:paymentMethodId", removeCard);
router.get("/payment/status/:bookingId", getPaymentStatus);

module.exports = router;
