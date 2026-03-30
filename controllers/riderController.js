const Rider = require("../models/riderModel");
const User = require("../models/user");

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
      profileImage:
        rider.user.profileImage ||
        "https://res.cloudinary.com/your-cloud/image/upload/v1/default-avatar.png",
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

    // Get complete onboarding data
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
    const { licenseNumber, expiryDate, frontImage, backImage } = req.body;

    await Rider.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          "documents.license": {
            licenseNumber,
            expiryDate: new Date(expiryDate),
            frontImage,
            backImage,
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
    const { provider, policyNumber, expiryDate, documentUrl } = req.body;

    await Rider.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          "documents.insurance": {
            provider,
            policyNumber,
            expiryDate: new Date(expiryDate),
            documentUrl,
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
    const { profilePhotoUrl } = req.body;

    if (!profilePhotoUrl) {
      return res.status(400).json({
        success: false,
        message: "Profile photo URL is required",
      });
    }

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
          "profileImageDetails.url": profilePhotoUrl,
          "profileImageDetails.uploadedAt": new Date(),
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

    // Update Rider model
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

    // Get complete onboarding data
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

    if (!rider.vehicleDetails.licensePlate)
      missingFields.push("Vehicle License Plate");
    if (!rider.vehicleDetails.make) missingFields.push("Vehicle Make");
    if (!rider.vehicleDetails.model) missingFields.push("Vehicle Model");
    if (!rider.documents.license.licenseNumber)
      missingFields.push("Driver's License");
    if (!rider.documents.insurance.documentUrl)
      missingFields.push("Insurance Document");
    if (!rider.documents.profilePhoto.url) missingFields.push("Profile Photo");
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

    // FIX: Change licensePlate to vehicleNumber
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

    if (req.body.name || req.body.email) {
      const userUpdate = {};
      if (req.body.name) userUpdate.name = req.body.name;
      if (req.body.email) userUpdate.email = req.body.email;
      // FIX: Use phoneNumber from req.body, not from destructured
      if (req.body.phoneNumber) userUpdate.phone = req.body.phoneNumber;

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

    rider.documents.license.status = "approved";
    rider.documents.insurance.status = "approved";
    rider.documents.profilePhoto.status = "approved";
    if (rider.documents.vehicleRegistration) {
      rider.documents.vehicleRegistration.status = "approved";
    }

    rider.isVerified = true;
    rider.verificationStatus = "approved";
    rider.status = "active";
    rider.verifiedAt = new Date();
    rider.updatedAt = new Date();
    rider.adminNotes = adminNotes;

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

    if (rejectedDocument) {
      switch (rejectedDocument) {
        case "license":
          rider.documents.license.status = "rejected";
          rider.documents.license.rejectionReason = rejectionReason;
          break;
        case "insurance":
          rider.documents.insurance.status = "rejected";
          rider.documents.insurance.rejectionReason = rejectionReason;
          break;
        case "profilePhoto":
          rider.documents.profilePhoto.status = "rejected";
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
