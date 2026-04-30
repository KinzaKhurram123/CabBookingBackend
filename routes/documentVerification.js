const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { protect } = require("../middleware/authMiddleware");
const { riderProtect } = require("../middleware/riderAuthMiddleware");
const { protectAdmin } = require("../middleware/adminMiddleware");
const {
  uploadDocument,
  getDriverDocuments,
  adminGetPendingDocuments,
  adminVerifyDocument,
} = require("../controllers/documentVerificationController");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/documents/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "doc-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, JPEG, and PNG files are allowed"));
    }
  },
});

// Driver routes
// @route   POST /api/documents/upload
// @desc    Upload verification document
// @access  Private (Rider only)
router.post("/upload", protect, riderProtect, upload.single("document"), uploadDocument);

// @route   GET /api/documents
// @desc    Get driver documents
// @access  Private (Rider only)
router.get("/", protect, riderProtect, getDriverDocuments);

// Admin routes
// @route   GET /api/documents/admin/pending
// @desc    Get pending documents for review
// @access  Private (Admin only)
router.get("/admin/pending", protectAdmin, adminGetPendingDocuments);

// @route   POST /api/documents/admin/verify
// @desc    Verify document (approve/reject)
// @access  Private (Admin only)
router.post("/admin/verify", protectAdmin, adminVerifyDocument);

module.exports = router;
