const User = require("../models/user");
const generateToken = require("../utils/generateToken");
const bcrypt = require("bcryptjs");
const { applyReferralCode } = require("./referralController");
const crypto = require("crypto");

const generateReferralCode = (userId) => {
  return (
    "REF" +
    crypto
      .createHash("sha256")
      .update(userId.toString())
      .digest("hex")
      .toUpperCase()
      .slice(0, 8)
  );
};

exports.registerUser = async (req, res) => {
  const { name, email, password, role, phoneNumber, referralCode } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phoneNumber,
    });

    // Generate referral code for new user
    user.referralCode = generateReferralCode(user._id);
    await user.save();

    // Apply referral if code provided
    if (referralCode) {
      await applyReferralCode(referralCode, user._id);
    }

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.driverSignup = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, city, country } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phoneNumber,
      city,
      country,
      role: "driver",
      driverDetails: {
        isVerified: false,
        verificationStatus: "pending",
        status: "pending_verification",
        documents: {
          license: { status: "pending" },
          insurance: { status: "pending" },
          profilePhoto: { status: "pending" },
          vehicleRegistration: { status: "pending" },
        },
        vehicleDetails: {},
        termsAccepted: false,
      },
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message:
        "Driver account created successfully. Please complete your profile to start driving.",
      data: {
        user: userResponse,
        token: generateToken(user._id),
        onboardingRequired: true,
        onboardingSteps: {
          vehicleDetails: false,
          license: false,
          insurance: false,
          profilePhoto: false,
          termsAccepted: false,
        },
        notificationMessage:
          "As soon as your account is verified, we will send you a notification.",
      },
    });
  } catch (error) {
    console.error("Driver signup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    // ✅ IMPORTANT: Agar customer hai to driverDetails hatao
    if (user.role !== "driver") {
      delete userResponse.driverDetails;
    }

    let responseData = {
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        token: generateToken(user._id),
      },
    };

    if (user.role === "driver") {
      const isOnboardingComplete =
        user.driverDetails.termsAccepted &&
        user.driverDetails.documents.license.licenseNumber &&
        user.driverDetails.documents.insurance.documentUrl &&
        user.driverDetails.documents.profilePhoto.url &&
        user.driverDetails.vehicleDetails.licensePlate;

      responseData.data.onboardingRequired = !isOnboardingComplete;
      responseData.data.verificationStatus =
        user.driverDetails.verificationStatus;
      responseData.data.isVerified = user.driverDetails.isVerified;
      responseData.data.driverDetails = user.driverDetails;

      if (
        !user.driverDetails.isVerified &&
        user.driverDetails.verificationStatus === "pending"
      ) {
        responseData.data.notificationMessage =
          "As soon as your account is verified, we will send you a notification.";
      }
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid Email" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    user.resetOTP = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    return res.json({
      message: "OTP sent to your email",
      body: user,
      otp: otp,
    });
  } catch (error) {
    console.error("Error in forgetPassword:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

exports.conformationPassword = async (req, res) => {
  try {
    const { code, email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid Email" });
    }
    if (!user.resetOTP) {
      return res
        .status(400)
        .json({ error: "OTP not generated for this email" });
    }
    if (parseInt(code) !== user.resetOTP) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    if (Date.now() > user.otpExpiry) {
      return res.status(400).json({ error: "OTP has expired" });
    }
    return res.json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error in checkCode:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.resetPassword = async (req, res) => {
  try {
    const { email, password, confirmpassword } = req.body;

    if (password !== confirmpassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid Email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetOTP = undefined;
    user.otpExpiry = undefined;

    await user.save();

    return res.json({ message: "Reset Password Successfully" });
  } catch (error) {
    console.error("Error in checkCode:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    console.log('Update Profile Request Body:', req.body);
    
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update basic fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.phoneNumber) user.phoneNumber = req.body.phoneNumber;
    if (req.body.email) user.email = req.body.email;

    // Update password if provided
    if (req.body.password) {
      user.password = req.body.password;
    }

    // Update profile image if provided
    if (req.body.profileImage) {
      console.log('Updating profileImage to:', req.body.profileImage);
      user.profileImage = req.body.profileImage;
    }

    const updatedUser = await user.save();
    console.log('Updated user profileImage:', updatedUser.profileImage);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        profileImage: updatedUser.profileImage,
        role: updatedUser.role,
        token: generateToken(updatedUser._id),
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (user) {
      res.status(200).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          profileImage: user.profileImage,
          role: user.role,
          walletBalance: user.walletBalance,
          referralCode: user.referralCode,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } else {
      res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};
