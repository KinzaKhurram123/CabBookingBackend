const Rider = require("../models/riderModel");
const path = require("path");
const fs = require("fs").promises;

// Supported file formats
const SUPPORTED_FORMATS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Upload document
exports.uploadDocument = async (req, res) => {
  try {
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Document file is required",
      });
    }

    // Validate document type
    const validTypes = ["license", "insurance", "vehicleRegistration", "profilePhoto"];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Validate file format
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!SUPPORTED_FORMATS.includes(fileExt)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file format. Supported formats: ${SUPPORTED_FORMATS.join(", ")}`,
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: "File size exceeds 10MB limit",
        maxSize: "10MB",
      });
    }

    const rider = await Rider.findOne({ user: req.user._id });
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    // Update document in rider model
    const documentUpdate = {
      status: "pending",
      uploadedAt: new Date(),
    };

    if (documentType === "license") {
      documentUpdate.frontImage = file.path;
      rider.documents.license = {
        ...rider.documents.license,
        ...documentUpdate,
      };
    } else if (documentType === "insurance") {
      documentUpdate.documentUrl = file.path;
      rider.documents.insurance = {
        ...rider.documents.insurance,
        ...documentUpdate,
      };
    } else if (documentType === "vehicleRegistration") {
      documentUpdate.documentUrl = file.path;
      rider.documents.vehicleRegistration = {
        ...rider.documents.vehicleRegistration,
        ...documentUpdate,
      };
    } else if (documentType === "profilePhoto") {
      documentUpdate.url = file.path;
      rider.documents.profilePhoto = {
        ...rider.documents.profilePhoto,
        ...documentUpdate,
      };
    }

    // If driver was previously verified, set to pending review
    if (rider.isVerified) {
      rider.isVerified = false;
      rider.verificationStatus = "in_review";
    }

    await rider.save();

    // TODO: Send notification to admins about new document upload

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      document: {
        type: documentType,
        status: "pending",
        uploadedAt: documentUpdate.uploadedAt,
      },
    });
  } catch (error) {
    console.error("Upload document error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get driver documents
exports.getDriverDocuments = async (req, res) => {
  try {
    const rider = await Rider.findOne({ user: req.user._id }).select("documents isVerified verificationStatus");

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    res.json({
      success: true,
      documents: {
        license: {
          status: rider.documents?.license?.status || "pending",
          uploadedAt: rider.documents?.license?.uploadedAt || null,
          rejectionReason: rider.documents?.license?.rejectionReason || null,
        },
        insurance: {
          status: rider.documents?.insurance?.status || "pending",
          uploadedAt: rider.documents?.insurance?.uploadedAt || null,
          rejectionReason: rider.documents?.insurance?.rejectionReason || null,
        },
        vehicleRegistration: {
          status: rider.documents?.vehicleRegistration?.status || "pending",
          uploadedAt: rider.documents?.vehicleRegistration?.uploadedAt || null,
          rejectionReason: rider.documents?.vehicleRegistration?.rejectionReason || null,
        },
        profilePhoto: {
          status: rider.documents?.profilePhoto?.status || "pending",
          uploadedAt: rider.documents?.profilePhoto?.uploadedAt || null,
        },
      },
      isFullyVerified: rider.isVerified,
      verificationStatus: rider.verificationStatus,
    });
  } catch (error) {
    console.error("Get driver documents error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin: Get pending documents
exports.adminGetPendingDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 20, documentType } = req.query;

    const filter = {};
    
    // Build filter for pending documents
    if (documentType) {
      filter[`documents.${documentType}.status`] = "pending";
    } else {
      filter.$or = [
        { "documents.license.status": "pending" },
        { "documents.insurance.status": "pending" },
        { "documents.vehicleRegistration.status": "pending" },
        { "documents.profilePhoto.status": "pending" },
      ];
    }

    const riders = await Rider.find(filter)
      .populate("user", "name email phone profileImage")
      .sort({ "documents.license.uploadedAt": 1 }) // Oldest first
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Rider.countDocuments(filter);

    // Format response
    const documents = [];
    riders.forEach((rider) => {
      if (rider.documents?.license?.status === "pending") {
        documents.push({
          id: `${rider._id}_license`,
          driver: {
            id: rider._id,
            name: rider.user?.name,
            email: rider.user?.email,
            phone: rider.user?.phone,
          },
          documentType: "license",
          fileUrl: rider.documents.license.frontImage,
          uploadedAt: rider.documents.license.uploadedAt,
          status: "pending",
        });
      }
      if (rider.documents?.insurance?.status === "pending") {
        documents.push({
          id: `${rider._id}_insurance`,
          driver: {
            id: rider._id,
            name: rider.user?.name,
            email: rider.user?.email,
            phone: rider.user?.phone,
          },
          documentType: "insurance",
          fileUrl: rider.documents.insurance.documentUrl,
          uploadedAt: rider.documents.insurance.uploadedAt,
          status: "pending",
        });
      }
      if (rider.documents?.vehicleRegistration?.status === "pending") {
        documents.push({
          id: `${rider._id}_vehicleRegistration`,
          driver: {
            id: rider._id,
            name: rider.user?.name,
            email: rider.user?.email,
            phone: rider.user?.phone,
          },
          documentType: "vehicleRegistration",
          fileUrl: rider.documents.vehicleRegistration.documentUrl,
          uploadedAt: rider.documents.vehicleRegistration.uploadedAt,
          status: "pending",
        });
      }
      if (rider.documents?.profilePhoto?.status === "pending") {
        documents.push({
          id: `${rider._id}_profilePhoto`,
          driver: {
            id: rider._id,
            name: rider.user?.name,
            email: rider.user?.email,
            phone: rider.user?.phone,
          },
          documentType: "profilePhoto",
          fileUrl: rider.documents.profilePhoto.url,
          uploadedAt: rider.documents.profilePhoto.uploadedAt,
          status: "pending",
        });
      }
    });

    res.json({
      success: true,
      count: documents.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      documents,
    });
  } catch (error) {
    console.error("Admin get pending documents error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin: Verify document (approve/reject)
exports.adminVerifyDocument = async (req, res) => {
  try {
    const { driverId, documentType, action, reason } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "approve" or "reject"',
      });
    }

    if (action === "reject" && !reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const rider = await Rider.findById(driverId);
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Update document status
    const newStatus = action === "approve" ? "approved" : "rejected";
    
    if (documentType === "license") {
      rider.documents.license.status = newStatus;
      if (action === "reject") {
        rider.documents.license.rejectionReason = reason;
      }
    } else if (documentType === "insurance") {
      rider.documents.insurance.status = newStatus;
      if (action === "reject") {
        rider.documents.insurance.rejectionReason = reason;
      }
    } else if (documentType === "vehicleRegistration") {
      rider.documents.vehicleRegistration.status = newStatus;
      if (action === "reject") {
        rider.documents.vehicleRegistration.rejectionReason = reason;
      }
    } else if (documentType === "profilePhoto") {
      rider.documents.profilePhoto.status = newStatus;
    }

    // Check if all required documents are approved
    const allApproved =
      rider.documents.license?.status === "approved" &&
      rider.documents.insurance?.status === "approved" &&
      rider.documents.vehicleRegistration?.status === "approved";

    if (allApproved) {
      rider.isVerified = true;
      rider.verificationStatus = "approved";
      rider.verifiedAt = new Date();
    } else if (action === "reject") {
      rider.isVerified = false;
      rider.verificationStatus = "rejected";
    }

    await rider.save();

    // TODO: Send notification to driver

    res.json({
      success: true,
      message: `Document ${action}d successfully`,
      document: {
        type: documentType,
        status: newStatus,
        rejectionReason: action === "reject" ? reason : null,
      },
      driverVerified: rider.isVerified,
      verificationStatus: rider.verificationStatus,
    });
  } catch (error) {
    console.error("Admin verify document error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  uploadDocument: exports.uploadDocument,
  getDriverDocuments: exports.getDriverDocuments,
  adminGetPendingDocuments: exports.adminGetPendingDocuments,
  adminVerifyDocument: exports.adminVerifyDocument,
};
