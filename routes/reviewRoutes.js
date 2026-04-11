const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { riderProtect } = require("../middleware/riderAuthMiddleware");
const {
  createReview,
  getReviewByBooking,
  getDriverReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  driverReplyToReview,
  getReviewStats,
  canReview,
} = require("../controllers/reviewController");

router.post("/:bookingId/create", protect, createReview);
router.get("/booking/:bookingId", protect, getReviewByBooking);
router.get("/user/my-reviews", protect, getUserReviews);
router.get("/can-review/:bookingId", protect, canReview);
router.put("/:reviewId/update", protect, updateReview);
router.delete("/:reviewId/delete", protect, deleteReview);

router.get("/driver/:driverId/reviews", getDriverReviews);
router.post(
  "/:reviewId/driver-reply",
  protect,
  riderProtect,
  driverReplyToReview,
);
router.get("/driver/stats", protect, riderProtect, getReviewStats);

module.exports = router;
