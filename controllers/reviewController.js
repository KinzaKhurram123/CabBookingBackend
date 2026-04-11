const Review = require("../models/Review");
const RideBooking = require("../models/rideBooking");
const Rider = require("../models/riderModel");
const User = require("../models/user");

exports.createReview = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, review, tags } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const booking = await RideBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isCustomer = booking.user.toString() === userId.toString();
    const isDriver =
      booking.driver && booking.driver.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    console.log("Authorization check:", {
      isCustomer,
      isDriver,
      isAdmin,
      bookingUser: booking.user.toString(),
      bookingDriver: booking.driver?.toString(),
      currentUser: userId.toString(),
    });

    if (!isCustomer && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to review this ride",
        debug: {
          bookingUser: booking.user.toString(),
          bookingDriver: booking.driver?.toString(),
          yourId: userId.toString(),
        },
      });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: `Cannot review ride that is ${booking.status}. Ride must be completed first.`,
        currentStatus: booking.status,
      });
    }

    const existingReview = await Review.findOne({
      bookingId,
      userId: userId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this ride",
      });
    }

    let reviewForId;
    let reviewForType;

    if (isCustomer) {
      reviewForId = booking.driver;
      reviewForType = "driver";
    } else if (isDriver) {
      reviewForId = booking.user;
      reviewForType = "customer";
    } else {
      reviewForId = null;
      reviewForType = "unknown";
    }

    if (!reviewForId) {
      return res.status(400).json({
        success: false,
        message: "Cannot determine review target",
      });
    }

    const newReview = await Review.create({
      bookingId,
      userId,
      reviewForId,
      reviewForType,
      driverId: reviewForType === "driver" ? reviewForId : null,
      rating,
      review: review || "",
      tags: tags || [],
    });

    const allReviewsForTarget = await Review.find({
      reviewForId: reviewForId,
      reviewForType: reviewForType,
      isDeleted: false,
    });

    const averageRating =
      allReviewsForTarget.length > 0
        ? allReviewsForTarget.reduce((sum, r) => sum + r.rating, 0) /
          allReviewsForTarget.length
        : rating;

    if (reviewForType === "driver") {
      await Rider.findByIdAndUpdate(reviewForId, {
        "driverDetails.rating": averageRating.toFixed(1),
        "driverDetails.totalReviews": allReviewsForTarget.length,
      });
    } else if (reviewForType === "customer") {
      await User.findByIdAndUpdate(reviewForId, {
        rating: averageRating.toFixed(1),
        totalReviews: allReviewsForTarget.length,
      });
    }

    const populatedReview = await Review.findById(newReview._id)
      .populate("userId", "name email profileImage")
      .populate("reviewForId", "name email profileImage phoneNumber")
      .populate(
        "bookingId",
        "pickupLocationName dropoffLocationName fare date status",
      );

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: populatedReview,
    });
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getReviewByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const review = await Review.findOne({ bookingId })
      .populate("userId", "name email profileImage")
      .populate("driverId", "name phoneNumber profileImage vehicleDetails")
      .populate(
        "bookingId",
        "pickupLocationName dropoffLocationName fare date status",
      );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "No review found for this booking",
      });
    }

    const booking = await RideBooking.findById(bookingId);
    const isUser = booking?.user.toString() === userId.toString();
    const isDriver = booking?.driver?.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isUser && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this review",
      });
    }

    return res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Get review error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getDriverReviews = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ driverId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("userId", "name email profileImage")
      .populate("bookingId", "pickupLocationName dropoffLocationName date");

    const total = await Review.countDocuments({ driverId, isDeleted: false });

    const ratingStats = await Review.aggregate([
      {
        $match: {
          driverId: mongoose.Types.ObjectId(driverId),
          isDeleted: false,
        },
      },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingStats.forEach((stat) => {
      distribution[stat._id] = stat.count;
    });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        stats: {
          total,
          averageRating: averageRating.toFixed(1),
          distribution,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get driver reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("driverId", "name profileImage vehicleDetails")
      .populate(
        "bookingId",
        "pickupLocationName dropoffLocationName fare date status",
      );

    const total = await Review.countDocuments({ userId, isDeleted: false });

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get user reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, review, tags } = req.body;
    const userId = req.user._id;

    const existingReview = await Review.findById(reviewId);
    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (existingReview.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this review",
      });
    }

    const hoursSinceCreation =
      (Date.now() - existingReview.createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(400).json({
        success: false,
        message: "Reviews can only be updated within 24 hours of submission",
      });
    }

    if (rating) existingReview.rating = rating;
    if (review !== undefined) existingReview.review = review;
    if (tags) existingReview.tags = tags;

    await existingReview.save();

    const allDriverReviews = await Review.find({
      driverId: existingReview.driverId,
      isDeleted: false,
    });
    const averageRating =
      allDriverReviews.reduce((sum, r) => sum + r.rating, 0) /
      allDriverReviews.length;

    await Rider.findByIdAndUpdate(existingReview.driverId, {
      "driverDetails.rating": averageRating.toFixed(1),
    });

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: existingReview,
    });
  } catch (error) {
    console.error("Update review error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = review.userId.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }

    review.isDeleted = true;
    await review.save();

    const allDriverReviews = await Review.find({
      driverId: review.driverId,
      isDeleted: false,
    });
    const averageRating =
      allDriverReviews.length > 0
        ? allDriverReviews.reduce((sum, r) => sum + r.rating, 0) /
          allDriverReviews.length
        : 0;

    await Rider.findByIdAndUpdate(review.driverId, {
      "driverDetails.rating": averageRating.toFixed(1),
      "driverDetails.totalReviews": allDriverReviews.length,
    });

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.driverReplyToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;
    const driverId = req.user._id;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Reply cannot be empty",
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if driver owns this review's ride
    if (review.driverId.toString() !== driverId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to reply to this review",
      });
    }

    review.driverReply = reply;
    review.repliedByDriver = true;
    review.repliedAt = new Date();
    await review.save();

    return res.status(200).json({
      success: true,
      message: "Reply added successfully",
      data: {
        driverReply: review.driverReply,
        repliedAt: review.repliedAt,
      },
    });
  } catch (error) {
    console.error("Driver reply error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getReviewStats = async (req, res) => {
  try {
    const driverId = req.user._id;

    const stats = await Review.aggregate([
      {
        $match: {
          driverId: mongoose.Types.ObjectId(driverId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          fiveStar: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          fourStar: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          threeStar: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          twoStar: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    const recentReviews = await Review.find({ driverId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "name profileImage");

    return res.status(200).json({
      success: true,
      data: {
        stats: stats[0] || {
          totalReviews: 0,
          averageRating: 0,
          fiveStar: 0,
          fourStar: 0,
          threeStar: 0,
          twoStar: 0,
          oneStar: 0,
        },
        recentReviews,
      },
    });
  } catch (error) {
    console.error("Get review stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.canReview = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await RideBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const isCompleted = booking.status === "completed";

    const existingReview = await Review.findOne({ bookingId });
    const alreadyReviewed = !!existingReview;

    return res.status(200).json({
      success: true,
      data: {
        canReview: isCompleted && !alreadyReviewed,
        isCompleted,
        alreadyReviewed,
        reviewId: existingReview?._id || null,
      },
    });
  } catch (error) {
    console.error("Can review error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
