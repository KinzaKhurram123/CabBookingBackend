const Rider = require("../models/riderModel");
const User = require("../models/user");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { default: mongoose } = require("mongoose");
const cloudinary = require("cloudinary").v2;
const stripe = require("../config/stripe");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/rider";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `temp-${req.user?._id || "user"}-${uniqueSuffix}${path.extname(file.originalname)}`,
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Only image files are allowed"));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

const cleanupTempFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted temp file: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error deleting temp file: ${filePath}`, err);
  }
};

const calculateOnboardingSteps = (rider) => {
  const vehicle = rider.vehicleDetails || {};
  const isVehicleComplete = !!(
    vehicle.category &&
    vehicle.vehicleType &&
    vehicle.make &&
    vehicle.model &&
    vehicle.year &&
    vehicle.licensePlate
  );

  const license = rider.documents?.license || {};
  const isLicenseComplete = !!(
    license.licenseNumber &&
    license.expiryDate &&
    license.frontImage &&
    license.backImage
  );

  const insurance = rider.documents?.insurance || {};
  const isInsuranceComplete = !!(
    insurance.provider &&
    insurance.policyNumber &&
    insurance.expiryDate &&
    insurance.documentUrl
  );

  const profilePhoto = rider.documents?.profilePhoto || {};
  const isProfilePhotoComplete = !!profilePhoto.url;

  return {
    vehicleDetails: isVehicleComplete,
    license: isLicenseComplete,
    insurance: isInsuranceComplete,
    profilePhoto: isProfilePhotoComplete,
    termsAccepted: rider.termsAccepted || false,
  };
};

const getOnboardingData = async (userId) => {
  try {
    const user = await User.findById(userId).select("-password");
    const rider = await Rider.findOne({ user: userId });

    if (!user || !rider) {
      return null;
    }

    const onboardingSteps = calculateOnboardingSteps(rider);

    const onboardingRequired = !(
      onboardingSteps.vehicleDetails &&
      onboardingSteps.license &&
      onboardingSteps.insurance &&
      onboardingSteps.profilePhoto &&
      onboardingSteps.termsAccepted
    );

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      riderDetails: {
        _id: rider._id,
        isVerified: rider.isVerified || false,
        verificationStatus: rider.verificationStatus || "pending",
        status: rider.status || "offline",
        rejectionReason: rider.rejectionReason || null,
        verifiedAt: rider.verifiedAt || null,
        totalRides: rider.totalRides || 0,
        totalEarning: rider.totalEarning || 0,
        rating: rider.rating || 5,
        termsAccepted: rider.termsAccepted || false,
        termsAcceptedAt: rider.termsAcceptedAt || null,
        location: rider.location || { type: "Point", coordinates: [0, 0] },
        address: rider.address || null,
        city: rider.city || null,
        emergencyContact: rider.emergencyContact || {
          name: null,
          phone: null,
          relation: null,
        },
      },
      vehicleDetails: {
        category: rider.vehicleDetails?.category || null,
        vehicleType: rider.vehicleDetails?.vehicleType || null,
        make: rider.vehicleDetails?.make || null,
        model: rider.vehicleDetails?.model || null,
        year: rider.vehicleDetails?.year || null,
        color: rider.vehicleDetails?.color || null,
        licensePlate: rider.vehicleDetails?.licensePlate || null,
        vehicleNumber: rider.vehicleDetails?.vehicleNumber || null,
      },
      documents: {
        license: {
          licenseNumber: rider.documents?.license?.licenseNumber || null,
          expiryDate: rider.documents?.license?.expiryDate || null,
          frontImage: rider.documents?.license?.frontImage || null,
          backImage: rider.documents?.license?.backImage || null,
          status: rider.documents?.license?.status || "pending",
          rejectionReason: rider.documents?.license?.rejectionReason || null,
          uploadedAt: rider.documents?.license?.uploadedAt || null,
        },
        insurance: {
          provider: rider.documents?.insurance?.provider || null,
          policyNumber: rider.documents?.insurance?.policyNumber || null,
          expiryDate: rider.documents?.insurance?.expiryDate || null,
          documentUrl: rider.documents?.insurance?.documentUrl || null,
          status: rider.documents?.insurance?.status || "pending",
          rejectionReason: rider.documents?.insurance?.rejectionReason || null,
          uploadedAt: rider.documents?.insurance?.uploadedAt || null,
        },
        profilePhoto: {
          url: rider.documents?.profilePhoto?.url || null,
          status: rider.documents?.profilePhoto?.status || "pending",
          uploadedAt: rider.documents?.profilePhoto?.uploadedAt || null,
        },
        vehicleRegistration: {
          documentUrl:
            rider.documents?.vehicleRegistration?.documentUrl || null,
          registrationNumber:
            rider.documents?.vehicleRegistration?.registrationNumber || null,
          status: rider.documents?.vehicleRegistration?.status || "pending",
          uploadedAt: rider.documents?.vehicleRegistration?.uploadedAt || null,
        },
      },
      onboardingSteps: onboardingSteps,
      onboardingRequired: onboardingRequired,
      notificationMessage:
        "As soon as your account is verified, we will send you a notification.",
    };
  } catch (error) {
    console.error("Error in getOnboardingData:", error);
    throw error;
  }
};

exports.addCompleteVehicleDetails = async (req, res) => {
  try {
    console.log("=== ADD COMPLETE VEHICLE DETAILS ===");
    console.log("req.files:", req.files);
    console.log("req.body:", req.body);

    const {
      category,
      subcategoryId,
      subcategoryName,
      make,
      model,
      year,
      color,
      licensePlate,
      vehicleNumber,
      registrationNumber,
    } = req.body;

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    let rider = await Rider.findOne({ user: userId });

    if (!rider) {
      rider = new Rider({
        user: userId,
        status: "offline",
        documents: {},
      });
    }

    if (!rider.vehicleDetails) {
      rider.vehicleDetails = {};
    }

    // Save Category & Subcategory
    if (category) {
      rider.vehicleDetails.category = category;
    }

    if (subcategoryId || subcategoryName) {
      rider.vehicleDetails.subcategory = {
        id: subcategoryId || null,
        name: subcategoryName || null,
      };
      rider.vehicleDetails.vehicleType = subcategoryName;
    }

    // Save Vehicle Details
    const finalLicensePlate = licensePlate || vehicleNumber;
    if (make) rider.vehicleDetails.make = make;
    if (model) rider.vehicleDetails.model = model;
    if (year) rider.vehicleDetails.year = year;
    if (color) rider.vehicleDetails.color = color;
    if (finalLicensePlate)
      rider.vehicleDetails.licensePlate = finalLicensePlate;

    // Upload Vehicle Photo
    if (req.files?.vehiclePhoto && req.files.vehiclePhoto[0]) {
      const result = await cloudinary.uploader.upload(
        req.files.vehiclePhoto[0].path,
        {
          folder: "riders/vehicle_photos",
        },
      );
      cleanupTempFile(req.files.vehiclePhoto[0].path);
      rider.vehicleDetails.photo = result.secure_url;
    }

    // Upload Registration Document
    if (
      req.files?.registrationDocument &&
      req.files.registrationDocument[0] &&
      registrationNumber
    ) {
      const result = await cloudinary.uploader.upload(
        req.files.registrationDocument[0].path,
        {
          folder: "riders/vehicle_registration",
        },
      );
      cleanupTempFile(req.files.registrationDocument[0].path);

      if (!rider.documents) rider.documents = {};
      rider.documents.vehicleRegistration = {
        registrationNumber: registrationNumber,
        documentUrl: result.secure_url,
        status: "pending",
        uploadedAt: new Date(),
      };
    }

    rider.updatedAt = new Date();
    await rider.save();

    const onboardingData = await getOnboardingData(userId);

    res.status(200).json({
      success: true,
      message: "Vehicle details saved successfully",
      data: onboardingData,
    });
  } catch (error) {
    console.error("Add vehicle details error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding vehicle details",
      error: error.message,
    });
  }
};

exports.addVehicleDetails = async (req, res) => {
  try {
    const {
      category,
      vehicleType,
      make,
      model,
      year,
      color,
      licensePlate,
      vehicleNumber,
    } = req.body;

    const userId = req.user?._id || req.user?.id;

    let rider = await Rider.findOne({ user: userId });

    if (!rider) {
      rider = new Rider({
        user: userId,
        status: "offline",
        documents: {},
      });
    }

    if (!rider.vehicleDetails) {
      rider.vehicleDetails = {};
    }

    if (category) rider.vehicleDetails.category = category;
    if (vehicleType) rider.vehicleDetails.vehicleType = vehicleType;
    if (make) rider.vehicleDetails.make = make;
    if (model) rider.vehicleDetails.model = model;
    if (year) rider.vehicleDetails.year = year;
    if (color) rider.vehicleDetails.color = color;
    if (licensePlate) rider.vehicleDetails.licensePlate = licensePlate;
    if (vehicleNumber) rider.vehicleDetails.vehicleNumber = vehicleNumber;

    rider.updatedAt = new Date();
    await rider.save();

    const onboardingData = await getOnboardingData(userId);

    res.status(200).json({
      success: true,
      message: "Vehicle details added successfully",
      data: onboardingData,
    });
  } catch (error) {
    console.error("Add vehicle details error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding vehicle details",
      error: error.message,
    });
  }
};

exports.uploadLicense = async (req, res) => {
  try {
    const { licenseNumber, expiryDate } = req.body;
    console.log("=== UPLOAD LICENSE START ===");

    const front = req.files?.frontImage?.[0];
    const back = req.files?.backImage?.[0];

    if (front?.size > 5 * 1024 * 1024 || back?.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Each file should be less than 5MB",
      });
    }

    if (!front || !back) {
      return res.status(400).json({
        success: false,
        message: "Front and back images are required",
      });
    }

    if (!licenseNumber || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "License number and expiry date are required",
      });
    }

    const userId = req.user._id || req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const frontUpload = await cloudinary.uploader.upload(front.path, {
      folder: "riders/license/front",
    });

    const backUpload = await cloudinary.uploader.upload(back.path, {
      folder: "riders/license/back",
    });

    cleanupTempFile(front.path);
    cleanupTempFile(back.path);

    let rider = await Rider.findOne({ user: userId });

    if (!rider) {
      rider = new Rider({
        user: userId,
        documents: {
          license: {
            licenseNumber,
            expiryDate: new Date(expiryDate),
            frontImage: frontUpload.secure_url,
            backImage: backUpload.secure_url,
            status: "pending",
            uploadedAt: new Date(),
          },
        },
      });
    } else {
      if (!rider.documents) {
        rider.documents = {};
      }

      rider.documents.license = {
        licenseNumber,
        expiryDate: new Date(expiryDate),
        frontImage: frontUpload.secure_url,
        backImage: backUpload.secure_url,
        status: "pending",
        uploadedAt: new Date(),
      };
    }

    rider.updatedAt = new Date();
    await rider.save();

    const onboardingData = await getOnboardingData(userId);

    res.status(200).json({
      success: true,
      message: "License uploaded successfully",
      data: onboardingData,
    });
  } catch (error) {
    console.error("Upload license error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while uploading license",
      error: error.message,
    });
  }
};

exports.uploadInsurance = async (req, res) => {
  try {
    console.log("=== UPLOAD INSURANCE DEBUG ===");
    console.log("req.user:", req.user);
    console.log("req.file:", req.file);
    console.log("req.body:", req.body);

    const { provider, policyNumber, expiryDate } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Insurance document is required",
      });
    }

    if (!provider || !policyNumber || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Provider, policy number and expiry date are required",
      });
    }

    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required: user ID missing",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "riders/insurance",
      resource_type: "auto",
    });

    cleanupTempFile(req.file.path);

    let rider = await Rider.findOne({ user: userId });

    if (!rider) {
      rider = new Rider({
        user: userId,
        documents: {},
      });
    }

    if (!rider.documents) {
      rider.documents = {};
    }

    let parsedExpiryDate;
    if (expiryDate.includes("-")) {
      const parts = expiryDate.split("-");
      if (parts[0].length === 4) {
        parsedExpiryDate = new Date(expiryDate);
      } else {
        const [day, month, year] = parts;
        parsedExpiryDate = new Date(`${year}-${month}-${day}`);
      }
    } else {
      parsedExpiryDate = new Date(expiryDate);
    }

    rider.documents.insurance = {
      provider,
      policyNumber,
      expiryDate: parsedExpiryDate,
      documentUrl: result.secure_url,
      status: "pending",
      uploadedAt: new Date(),
    };

    rider.updatedAt = new Date();
    await rider.save();

    const onboardingData = await getOnboardingData(userId);

    res.status(200).json({
      success: true,
      message: "Insurance uploaded successfully",
      data: onboardingData,
    });
  } catch (error) {
    console.error("Upload insurance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while uploading insurance",
      error: error.message,
    });
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    console.log("=== UPLOAD PROFILE PHOTO DEBUG ===");
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("req.user:", req.user);
    console.log("req.file:", req.file);
    console.log("req.body:", req.body);

    let file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file received. Please send file as 'profilePhoto' field",
      });
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required: user ID missing",
      });
    }

    const result = await cloudinary.uploader.upload(file.path, {
      folder: "riders/profile_photos",
      transformation: [{ width: 500, height: 500, crop: "limit" }],
    });

    cleanupTempFile(file.path);

    let rider = await Rider.findOne({ user: userId });

    if (!rider) {
      rider = new Rider({
        user: userId,
        documents: {},
      });
    }

    if (!rider.documents) {
      rider.documents = {};
    }

    const existingPhoto = rider.documents.profilePhoto;
    const photoStatus =
      existingPhoto?.status === "approved" ? "approved" : "pending";

    rider.documents.profilePhoto = {
      url: result.secure_url,
      status: photoStatus,
      uploadedAt: new Date(),
    };

    rider.updatedAt = new Date();
    await rider.save();

    if (photoStatus === "approved") {
      await User.findByIdAndUpdate(userId, {
        profileImage: result.secure_url,
      });
    }

    const onboardingData = await getOnboardingData(userId);

    res.status(200).json({
      success: true,
      message:
        photoStatus === "approved"
          ? "Profile photo updated successfully"
          : "Profile photo uploaded and pending admin approval",
      data: onboardingData,
    });
  } catch (error) {
    console.error("Upload profile photo error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while uploading profile photo",
      error: error.message,
    });
  }
};

exports.acceptTerms = async (req, res) => {
  try {
    const { accepted } = req.body;

    if (!accepted) {
      return res.status(400).json({
        success: false,
        message: "You must accept the terms and conditions to continue",
      });
    }

    const userId = req.user?._id || req.user?.id;

    await Rider.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          termsAccepted: true,
          termsAcceptedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    );

    const onboardingData = await getOnboardingData(userId);

    res.status(200).json({
      success: true,
      message: "Terms and conditions accepted",
      data: onboardingData,
    });
  } catch (error) {
    console.error("Accept terms error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while accepting terms",
      error: error.message,
    });
  }
};

exports.submitForVerification = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const rider = await Rider.findOne({ user: userId });

    const missingFields = [];

    if (!rider?.vehicleDetails?.licensePlate)
      missingFields.push("Vehicle License Plate");
    if (!rider?.vehicleDetails?.make) missingFields.push("Vehicle Make");
    if (!rider?.vehicleDetails?.model) missingFields.push("Vehicle Model");
    if (!rider?.documents?.license?.licenseNumber)
      missingFields.push("Driver's License");
    if (!rider?.documents?.insurance?.documentUrl)
      missingFields.push("Insurance Document");
    if (!rider?.documents?.profilePhoto?.url)
      missingFields.push("Profile Photo");
    if (!rider?.termsAccepted)
      missingFields.push("Terms & Conditions Acceptance");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields",
        missingFields,
      });
    }

    rider.verificationStatus = "in_review";
    rider.status = "pending_verification";
    rider.updatedAt = new Date();
    await rider.save();

    // Auto-create Stripe Connect account for driver
    if (!rider.stripeConnectAccountId) {
      try {
        const user = await User.findById(userId);
        if (user && user.email) {
          const account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: user.email,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: 'individual',
            metadata: {
              riderId: rider._id.toString(),
              userId: user._id.toString()
            }
          });

          rider.stripeConnectAccountId = account.id;
          rider.connectAccountStatus = 'pending';
          rider.connectAccountCreatedAt = new Date();
          await rider.save();

          console.log(`Stripe Connect account created for rider ${rider._id}: ${account.id}`);
        }
      } catch (stripeError) {
        console.error('Stripe Connect account creation error:', stripeError.message);
        // Don't fail the verification submission if Stripe account creation fails
      }
    }

    const onboardingData = await getOnboardingData(userId);

    res.status(200).json({
      success: true,
      message: "Profile submitted for verification",
      data: onboardingData,
    });
  } catch (error) {
    console.error("Submit verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const onboardingData = await getOnboardingData(userId);

    if (!onboardingData) {
      return res.status(404).json({
        success: false,
        message: "Rider profile not found",
      });
    }

    res.status(200).json({
      success: true,
      data: onboardingData,
    });
  } catch (error) {
    console.error("Get onboarding status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const rider = await Rider.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          address: address || null,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    );

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: {
        location: rider.location,
        address: rider.address,
      },
    });
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating location",
      error: error.message,
    });
  }
};

exports.getRiderProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const onboardingData = await getOnboardingData(userId);

    if (!onboardingData) {
      return res.status(404).json({
        success: false,
        message: "Rider profile not found",
      });
    }

    res.status(200).json({
      success: true,
      data: onboardingData,
    });
  } catch (error) {
    console.error("Get rider profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
      error: error.message,
    });
  }
};

exports.updateRiderProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const {
      phoneNumber,
      vehicleType,
      vehicleNumber,
      make,
      model,
      year,
      color,
      address,
      city,
      emergencyContact,
    } = req.body;

    const updateData = {
      updatedAt: new Date(),
    };

    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (address) updateData.address = address;
    if (city) updateData.city = city;
    if (emergencyContact) updateData.emergencyContact = emergencyContact;

    if (make || model || year || color || vehicleNumber || vehicleType) {
      updateData.vehicleDetails = {
        make: make || "",
        model: model || "",
        year: year || "",
        color: color || "",
        vehicleType: vehicleType || "",
        vehicleNumber: vehicleNumber || "",
      };
    }

    await Rider.findOneAndUpdate(
      { user: userId },
      { $set: updateData },
      { new: true, upsert: true },
    );

    if (req.body.name || req.body.email || req.body.phoneNumber) {
      const userUpdate = {};
      if (req.body.name) userUpdate.name = req.body.name;
      if (req.body.email) userUpdate.email = req.body.email;
      if (req.body.phoneNumber) userUpdate.phoneNumber = req.body.phoneNumber;

      await User.findByIdAndUpdate(userId, { $set: userUpdate });
    }

    const onboardingData = await getOnboardingData(userId);

    res.status(200).json({
      success: true,
      message: "Rider profile updated successfully",
      data: onboardingData,
    });
  } catch (error) {
    console.error("Update rider profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating rider profile",
      error: error.message,
    });
  }
};

exports.updateRiderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const rider = req.rider;

    const validStatuses = ["available", "offline"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use 'available' or 'offline'",
      });
    }

    if (status === "available" && rider.verificationStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message:
          "Your account is not verified yet. Please complete verification first.",
      });
    }

    rider.status = status;
    await rider.save();

    res.status(200).json({
      success: true,
      message: `You are now ${status === "available" ? "Online" : "Offline"}`,
      data: {
        _id: rider._id,
        status: rider.status,
      },
    });
  } catch (error) {
    console.error("Update rider status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.debugDatabase = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const rider = await Rider.findOne({ user: userId });

    res.status(200).json({
      success: true,
      userId: userId,
      riderExists: !!rider,
      riderData: rider
        ? {
            _id: rider._id,
            vehicleDetails: rider.vehicleDetails,
            documents: {
              license: rider.documents?.license,
              insurance: rider.documents?.insurance,
              profilePhoto: rider.documents?.profilePhoto,
              vehicleRegistration: rider.documents?.vehicleRegistration,
            },
            termsAccepted: rider.termsAccepted,
            status: rider.status,
            verificationStatus: rider.verificationStatus,
          }
        : null,
      userData: {
        profileImage: req.user?.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.upload = upload;

// ─── Rider All Bookings History ───────────────────────────────────────────────
const RideBooking = require("../models/rideBooking");
const ParcelBooking = require("../models/parcelBooking");
const PetDeliveryBooking = require("../models/petDeliveryBooking");
const Review = require("../models/Review");

exports.getRiderBookingHistory = async (req, res) => {
  try {
    const riderId = req.rider?._id;
    if (!riderId) {
      return res.status(401).json({ success: false, message: "Rider not authenticated" });
    }

    const {
      page = 1,
      limit = 10,
      status,        // filter by status e.g. completed, cancelled
      type,          // filter by type: ride | parcel | pet
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const lim  = parseInt(limit);

    const statusFilter = status ? { status } : {};

    // ── Fetch all three in parallel ──────────────────────────────────────────
    const [rides, parcels, pets] = await Promise.all([
      (!type || type === "ride")
        ? RideBooking.find({ driver: riderId, ...statusFilter })
            .select("_id status fare totalFare distance duration pickupLocationName dropoffLocationName createdAt completedAt paymentType paymentStatus user")
            .populate("user", "name profileImage phoneNumber")
            .lean()
        : [],
      (!type || type === "parcel")
        ? ParcelBooking.find({ driver: riderId, ...statusFilter })
            .select("_id status fare totalFare distance duration pickupLocationName dropoffLocationName createdAt completedAt paymentType paymentStatus user")
            .populate("user", "name profileImage phoneNumber")
            .lean()
        : [],
      (!type || type === "pet")
        ? PetDeliveryBooking.find({ driver: riderId, ...statusFilter })
            .select("_id status fare totalFare distance duration pickupLocationName dropoffLocationName createdAt completedAt paymentType paymentStatus user pet_name pet_type")
            .populate("user", "name profileImage phoneNumber")
            .lean()
        : [],
    ]);

    // ── Tag each booking with its type ───────────────────────────────────────
    const taggedRides   = rides.map(b   => ({ ...b, bookingType: "ride" }));
    const taggedParcels = parcels.map(b => ({ ...b, bookingType: "parcel" }));
    const taggedPets    = pets.map(b    => ({ ...b, bookingType: "pet" }));

    // ── Merge & sort by createdAt desc ───────────────────────────────────────
    const all = [...taggedRides, ...taggedParcels, ...taggedPets].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const total      = all.length;
    const paginated  = all.slice(skip, skip + lim);

    // ── Attach reviews for completed bookings ────────────────────────────────
    const completedIds = paginated
      .filter(b => b.status === "completed")
      .map(b => b._id);

    const reviews = completedIds.length
      ? await Review.find({ bookingId: { $in: completedIds }, isDeleted: false })
          .select("bookingId rating review reviewForType tags createdAt")
          .lean()
      : [];

    const reviewMap = {};
    reviews.forEach(r => {
      reviewMap[r.bookingId.toString()] = r;
    });

    const result = paginated.map(b => ({
      ...b,
      review: reviewMap[b._id.toString()] || null,
    }));

    // ── Summary stats ────────────────────────────────────────────────────────
    const completed  = all.filter(b => b.status === "completed");
    const totalEarnings = completed.reduce((sum, b) => {
      const fare = parseFloat(b.totalFare || b.fare || 0);
      return sum + (isNaN(fare) ? 0 : fare * 0.8); // 80% rider share
    }, 0);

    return res.status(200).json({
      success: true,
      data: {
        bookings: result,
        pagination: {
          total,
          page: parseInt(page),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        summary: {
          total,
          completed: completed.length,
          cancelled: all.filter(b => b.status === "cancelled").length,
          pending:   all.filter(b => b.status === "pending").length,
          totalEarnings: parseFloat(totalEarnings.toFixed(2)),
          byType: {
            ride:   taggedRides.length,
            parcel: taggedParcels.length,
            pet:    taggedPets.length,
          },
        },
      },
    });
  } catch (error) {
    console.error("Get rider booking history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// REQUEST ACCOUNT DELETION (Rider)
// Deactivates immediately, deletes after 3 days
// DELETE /api/rider/account
// ─────────────────────────────────────────────
exports.requestAccountDeletion = async (req, res) => {
  try {
    const Rider = require('../models/riderModel');
    const User = require('../models/user');
    const userId = req.user?._id || req.user?.id;

    const rider = await Rider.findOne({ user: userId });
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
    }

    if (!rider.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account deletion already requested',
        scheduledDeletionAt: rider.scheduledDeletionAt
      });
    }

    const scheduledDeletionAt = new Date();
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 3); // 3 days from now

    // Deactivate rider profile
    rider.isActive = false;
    rider.status = 'offline';
    rider.deletionRequestedAt = new Date();
    rider.scheduledDeletionAt = scheduledDeletionAt;
    await rider.save();

    // Also deactivate the linked user account
    await User.findByIdAndUpdate(userId, {
      isActive: false,
      deletionRequestedAt: rider.deletionRequestedAt,
      scheduledDeletionAt: rider.scheduledDeletionAt
    });

    res.status(200).json({
      success: true,
      message: 'Account deactivated. It will be permanently deleted after 3 days.',
      deletionRequestedAt: rider.deletionRequestedAt,
      scheduledDeletionAt: rider.scheduledDeletionAt
    });
  } catch (error) {
    console.error('Request account deletion error (rider):', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ─────────────────────────────────────────────
// CANCEL ACCOUNT DELETION (Rider) — restore account
// POST /api/rider/account/restore
// ─────────────────────────────────────────────
exports.cancelAccountDeletion = async (req, res) => {
  try {
    const Rider = require('../models/riderModel');
    const User = require('../models/user');
    const userId = req.user?._id || req.user?.id;

    const rider = await Rider.findOne({ user: userId });
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
    }

    if (rider.isActive) {
      return res.status(400).json({ success: false, message: 'Account is already active' });
    }

    rider.isActive = true;
    rider.deletionRequestedAt = null;
    rider.scheduledDeletionAt = null;
    await rider.save();

    await User.findByIdAndUpdate(userId, {
      isActive: true,
      deletionRequestedAt: null,
      scheduledDeletionAt: null
    });

    res.status(200).json({
      success: true,
      message: 'Account deletion cancelled. Your account has been restored.'
    });
  } catch (error) {
    console.error('Cancel account deletion error (rider):', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};
