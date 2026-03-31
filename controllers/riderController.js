const Rider = require("../models/riderModel");
const User = require("../models/user");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;

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
  const allowedTypes = /jpeg|jpg|png|gif/;
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
  limits: { fileSize: 5 * 1024 * 1024 },
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

const getOnboardingData = async (userId) => {
  const rider = await Rider.findOne({ user: userId }).populate(
    "user",
    "-password",
  );

  if (!rider) return null;

  return {
    user: {
      _id: rider.user._id,
      name: rider.user.name,
      email: rider.user.email,
      phoneNumber: rider.user.phoneNumber,
      role: rider.user.role,
      profileImage: rider.user.profileImage || null,
      country: rider.user.country,
      city: rider.user.city,
      createdAt: rider.user.createdAt,
      updatedAt: rider.user.updatedAt,
    },
    riderDetails: {
      _id: rider._id,
      isVerified: rider.isVerified,
      verificationStatus: rider.verificationStatus,
      status: rider.status,
      rejectionReason: rider.rejectionReason,
      verifiedAt: rider.verifiedAt,
      totalRides: rider.totalRides,
      totalEarning: rider.totalEarning,
      rating: rider.rating,
      termsAccepted: rider.termsAccepted,
      termsAcceptedAt: rider.termsAcceptedAt,
      location: rider.location,
      address: rider.address,
      city: rider.city,
      emergencyContact: rider.emergencyContact,
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
        url:
          rider.documents?.profilePhoto?.url ||
          rider.user?.profileImage ||
          null,
        status: rider.documents?.profilePhoto?.status || "pending",
        uploadedAt: rider.documents?.profilePhoto?.uploadedAt || null,
      },
      vehicleRegistration: {
        documentUrl: rider.documents?.vehicleRegistration?.documentUrl || null,
        registrationNumber:
          rider.documents?.vehicleRegistration?.registrationNumber || null,
        status: rider.documents?.vehicleRegistration?.status || "pending",
        uploadedAt: rider.documents?.vehicleRegistration?.uploadedAt || null,
      },
    },
    onboardingSteps: {
      vehicleDetails: !!(
        rider.vehicleDetails?.licensePlate &&
        rider.vehicleDetails?.make &&
        rider.vehicleDetails?.model
      ),
      license: !!rider.documents?.license?.licenseNumber,
      insurance: !!rider.documents?.insurance?.documentUrl,
      profilePhoto: !!(
        rider.documents?.profilePhoto?.url || rider.user?.profileImage
      ),
      termsAccepted: rider.termsAccepted || false,
    },
    onboardingRequired: !(
      rider.vehicleDetails?.licensePlate &&
      rider.vehicleDetails?.make &&
      rider.vehicleDetails?.model &&
      rider.documents?.license?.licenseNumber &&
      rider.documents?.insurance?.documentUrl &&
      (rider.documents?.profilePhoto?.url || rider.user?.profileImage) &&
      rider.termsAccepted
    ),
    notificationMessage:
      "As soon as your account is verified, we will send you a notification.",
  };
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

    await Rider.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          "vehicleDetails.category": category,
          "vehicleDetails.vehicleType": vehicleType,
          "vehicleDetails.make": make,
          "vehicleDetails.model": model,
          "vehicleDetails.year": year,
          "vehicleDetails.color": color,
          "vehicleDetails.licensePlate": licensePlate,
          "vehicleDetails.vehicleNumber": vehicleNumber,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    );

    const onboardingData = await getOnboardingData(req.user._id);

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

    const front = req.files?.frontImage?.[0];
    const back = req.files?.backImage?.[0];

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

    const frontUpload = await cloudinary.uploader.upload(front.path, {
      folder: "riders/license/front",
    });

    const backUpload = await cloudinary.uploader.upload(back.path, {
      folder: "riders/license/back",
    });

    cleanupTempFile(front.path);
    cleanupTempFile(back.path);

    await Rider.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          "documents.license": {
            licenseNumber,
            expiryDate: new Date(expiryDate),
            frontImage: frontUpload.secure_url,
            backImage: backUpload.secure_url,
            status: "pending",
            uploadedAt: new Date(),
          },
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    );

    const onboardingData = await getOnboardingData(req.user._id);

    res.status(200).json({
      success: true,
      message: "License uploaded successfully. Awaiting verification.",
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

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "riders/insurance",
      resource_type: "auto",
    });

    // Clean up temp file
    cleanupTempFile(req.file.path);

    // Update database
    await Rider.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          "documents.insurance": {
            provider,
            policyNumber,
            expiryDate: new Date(expiryDate),
            documentUrl: result.secure_url,
            status: "pending",
            uploadedAt: new Date(),
          },
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    );

    const onboardingData = await getOnboardingData(req.user._id);

    res.status(200).json({
      success: true,
      message: "Insurance uploaded successfully. Awaiting verification.",
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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile photo file is required",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "riders/profile_photos",
      transformation: [
        {
          width: 500,
          height: 500,
          crop: "limit",
        },
      ],
    });

    const profilePhotoUrl = result.secure_url;

    cleanupTempFile(req.file.path);

    await Rider.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          "documents.profilePhoto": {
            url: profilePhotoUrl,
            status: "pending",
            uploadedAt: new Date(),
          },
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    );

    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          profileImage: profilePhotoUrl,
        },
      },
      { new: true },
    );

    const onboardingData = await getOnboardingData(req.user._id);

    res.status(200).json({
      success: true,
      message: "Profile photo uploaded successfully",
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

    await Rider.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          termsAccepted: true,
          termsAcceptedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    );

    const onboardingData = await getOnboardingData(req.user._id);

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
    const rider = await Rider.findOne({ user: req.user._id });

    const missingFields = [];

    if (!rider.vehicleDetails?.licensePlate)
      missingFields.push("Vehicle License Plate");
    if (!rider.vehicleDetails?.make) missingFields.push("Vehicle Make");
    if (!rider.vehicleDetails?.model) missingFields.push("Vehicle Model");
    if (!rider.documents?.license?.licenseNumber)
      missingFields.push("Driver's License");
    if (!rider.documents?.insurance?.documentUrl)
      missingFields.push("Insurance Document");
    if (!rider.documents?.profilePhoto?.url)
      missingFields.push("Profile Photo");
    if (!rider.termsAccepted)
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

    const onboardingData = await getOnboardingData(req.user._id);

    res.status(200).json({
      success: true,
      message:
        "Profile submitted for verification. You'll receive a notification once verified.",
      data: onboardingData,
    });
  } catch (error) {
    console.error("Submit verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while submitting for verification",
      error: error.message,
    });
  }
};

exports.getOnboardingStatus = async (req, res) => {
  try {
    const onboardingData = await getOnboardingData(req.user._id);

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

exports.updateRiderProfile = async (req, res) => {
  try {
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
      { user: req.user._id },
      { $set: updateData },
      { new: true, upsert: true },
    );

    if (req.body.name || req.body.email || req.body.phoneNumber) {
      const userUpdate = {};
      if (req.body.name) userUpdate.name = req.body.name;
      if (req.body.email) userUpdate.email = req.body.email;
      if (req.body.phoneNumber) userUpdate.phoneNumber = req.body.phoneNumber;

      await User.findByIdAndUpdate(req.user._id, { $set: userUpdate });
    }

    const onboardingData = await getOnboardingData(req.user._id);

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

exports.getPendingVerifications = async (req, res) => {
  try {
    const pendingRiders = await Rider.find({
      verificationStatus: "in_review",
      isVerified: false,
    }).populate("user", "name email phoneNumber profileImage");

    res.status(200).json({
      success: true,
      count: pendingRiders.length,
      data: pendingRiders,
    });
  } catch (error) {
    console.error("Get pending verifications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.approveRider = async (req, res) => {
  try {
    const { riderId } = req.params;
    const { adminNotes } = req.body;

    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    // Update document statuses
    if (rider.documents?.license) rider.documents.license.status = "approved";
    if (rider.documents?.insurance)
      rider.documents.insurance.status = "approved";
    if (rider.documents?.profilePhoto)
      rider.documents.profilePhoto.status = "approved";
    if (rider.documents?.vehicleRegistration) {
      rider.documents.vehicleRegistration.status = "approved";
    }

    rider.isVerified = true;
    rider.verificationStatus = "approved";
    rider.status = "active";
    rider.verifiedAt = new Date();
    rider.updatedAt = new Date();
    if (adminNotes) rider.adminNotes = adminNotes;

    await rider.save();

    const onboardingData = await getOnboardingData(rider.user);

    res.status(200).json({
      success: true,
      message: "Rider approved successfully. They can now start driving.",
      data: onboardingData,
    });
  } catch (error) {
    console.error("Approve rider error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.rejectRider = async (req, res) => {
  try {
    const { riderId } = req.params;
    const { rejectionReason, rejectedDocument } = req.body;

    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    if (rejectedDocument && rider.documents) {
      switch (rejectedDocument) {
        case "license":
          if (rider.documents.license) {
            rider.documents.license.status = "rejected";
            rider.documents.license.rejectionReason = rejectionReason;
          }
          break;
        case "insurance":
          if (rider.documents.insurance) {
            rider.documents.insurance.status = "rejected";
            rider.documents.insurance.rejectionReason = rejectionReason;
          }
          break;
        case "profilePhoto":
          if (rider.documents.profilePhoto) {
            rider.documents.profilePhoto.status = "rejected";
          }
          break;
        default:
          break;
      }
    }

    rider.isVerified = false;
    rider.verificationStatus = "rejected";
    rider.status = "inactive";
    rider.rejectionReason = rejectionReason;
    rider.updatedAt = new Date();

    await rider.save();
    const onboardingData = await getOnboardingData(rider.user);

    res.status(200).json({
      success: false,
      message: "Rider rejected. They need to resubmit documents.",
      data: onboardingData,
    });
  } catch (error) {
    console.error("Reject rider error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.upload = upload;
