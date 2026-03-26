const express = require("express");
const {
  registerUser,
  loginUser,
  forgetPassword,
  conformationPassword,
  resetPassword,
  getProfile,
  getUserProfile,
  updateProfile,
  driverSignup,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/register/driver", driverSignup);
router.post("/login", loginUser);
router.post("/forget_password", forgetPassword);
router.post("/checkOTP", conformationPassword);
router.post("/reset_password", resetPassword);

router.post("/edit_profile", updateProfile);
router.post("/get_profile", getProfile);

module.exports = router;
