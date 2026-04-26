const mongoose = require("mongoose");
const ParcelBooking = require("../models/parcelBooking");
const RideBooking = require("../models/rideBooking");
const PetDeliveryBooking = require("../models/petDeliveryBooking");
const User = require("../models/user");
const Rider = require("../models/riderModel");
const stripe = require("../config/stripe");
const pusher = require("../config/pusher");
const { calculateParcelFare } = require("../utils/fareCalculator");
const geolib = require("geolib");

// const calculateParcelFare = (
//   distance,
//   vehicleType,
//   weight,
//   numberOfPackages,
//   fragileItem = false,
// ) => {
//   let baseFare = 0;
//   switch (vehicleType) {
//     case "bike":
//       baseFare = 5;
//       break;
//     case "car":
//       baseFare = 10;
//       break;
//     case "van":
//       baseFare = 15;
//       break;
//     case "truck":
//       baseFare = 25;
//       break;
//     default:
//       baseFare = 10;
//   }
//   const distanceFare = distance * 1.5;
//   const weightFare = weight * 0.5;
//   const packageFare = numberOfPackages * 1;
//   const fragileSurcharge = fragileItem ? baseFare * 0.2 : 0; // 20% surcharge for fragile items

//   return baseFare + distanceFare + weightFare + packageFare + fragileSurcharge;
// };

const estimateDeliveryTime = (distance, vehicleType) => {
  let speed = 0;
  switch (vehicleType) {
    case "bike":
      speed = 40;
      break;
    case "car":
      speed = 60;
      break;
    case "van":
      speed = 50;
      break;
    case "truck":
      speed = 45;
      break;
    default:
      speed = 50;
  }
  const timeInHours = distance / speed;
  const timeInMinutes = distance === 0 ? 5 : Math.round(timeInHours * 60);
  return Math.round(timeInMinutes);
};

const calculateDistance = (pickup, dropoff) => {
  return (
    geolib.getDistance(
      { latitude: parseFloat(pickup.lat), longitude: parseFloat(pickup.lng) },
      { latitude: parseFloat(dropoff.lat), longitude: parseFloat(dropoff.lng) },
    ) / 1000
  );
};

exports.createParcelBooking = async (req, res) => {
  try {
    const {
      receiverName,
      receiverPhoneNumber,
      cargoType,
      selectedVehicle,
      weight,
      height,
      length,
      numberOfPackages,
      fragileItem,
      pickupLocation,
      dropoffLocation,
      pickupLocationName,
      dropoffLocationName,
      notes,
      parcel_type,
      paymentMethod,
    } = req.body;

    const requiredFields = [
      "receiverName",
      "receiverPhoneNumber",
      "cargoType",
      "selectedVehicle",
      "weight",
      "height",
      "length",
      "numberOfPackages",
      "pickupLocation",
      "dropoffLocation",
      "pickupLocationName",
      "dropoffLocationName",
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`,
        });
      }
    }

    if (!pickupLocation.lat || !pickupLocation.lng) {
      return res.status(400).json({
        success: false,
        message: "Pickup location missing or invalid",
      });
    }
    if (!dropoffLocation.lat || !dropoffLocation.lng) {
      return res.status(400).json({
        success: false,
        message: "Dropoff location missing or invalid",
      });
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check for existing active bookings (ride, parcel, or pet delivery)
    const activeStatuses = ["pending", "accepted", "onTheWay", "arrived", "inProgress"];
    
    const existingRideBooking = await RideBooking.findOne({
      user: req.user._id,
      status: { $in: activeStatuses },
    });
    
    const existingParcelBooking = await ParcelBooking.findOne({
      user: req.user._id,
      status: { $in: activeStatuses },
    });
    
    const existingPetBooking = await PetDeliveryBooking.findOne({
      user: req.user._id,
      status: { $in: activeStatuses },
    });

    if (existingRideBooking || existingParcelBooking || existingPetBooking) {
      return res.status(400).json({
        success: false,
        message: "You already have an active booking. Please complete or cancel it before creating a new one.",
        hasActiveBooking: true,
        activeBookingType: existingRideBooking ? "ride" : existingParcelBooking ? "parcel" : "pet_delivery",
      });
    }

    if (paymentMethod === "Card" && !user.defaultPaymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Please add a payment method before booking",
        requiresPaymentSetup: true,
      });
    }

    const distance = calculateDistance(pickupLocation, dropoffLocation);
    const estimateTime = estimateDeliveryTime(distance, selectedVehicle);

    const fareResult = calculateParcelFare(
      distance,
      estimateTime,
      weight,
      new Date(),
    );
    const totalFare = fareResult.totalFare;

    let paymentIntent = null;

    if (paymentMethod === "Card") {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalFare * 100),
        currency: "usd",
        customer: user.stripeCustomerId,
        payment_method: user.defaultPaymentMethod,
        capture_method: "manual",
        metadata: {
          bookingType: "parcel_delivery",
          userId: req.user._id.toString(),
          receiverName: receiverName,
          receiverPhone: receiverPhoneNumber,
          pickupLocation: JSON.stringify(pickupLocation),
          dropLocation: JSON.stringify(dropoffLocation),
          fare: totalFare.toString(),
          vehicleType: selectedVehicle,
        },
        confirm: true,
        off_session: true,
      });
    }

    // Convert pickupLocation to GeoJSON format for geospatial queries
    const pickupGeoJSON = {
      type: "Point",
      coordinates: [
        parseFloat(pickupLocation.lng),
        parseFloat(pickupLocation.lat),
      ],
    };

    const newBooking = new ParcelBooking({
      user: req.user._id,
      receiverName,
      receiverPhoneNumber,
      cargoType,
      selectedVehicle,
      weight,
      height,
      length,
      numberOfPackages,
      fragileItem: fragileItem || false,
      distance: distance.toString(),
      time: `${estimateTime} minutes`,
      duration: `${estimateTime}`,
      estimateTime: `${estimateTime} minutes`,
      totalFare,
      fare: totalFare.toString(),
      price: totalFare,
      pickupLocation: pickupGeoJSON,
      dropoffLocation: dropoffLocation,
      pickupLocationName,
      dropoffLocationName,
      notes,
      parcel_type,
      paymentIntentId: paymentIntent ? paymentIntent.id : null,
      paymentStatus: paymentIntent ? "authorized" : "pending",
      paymentType: paymentMethod === "Card" ? "Card" : "Cash",
      paymentMethod: paymentMethod || "Cash",
      status: "pending",
    });

    const savedBooking = await newBooking.save();
    const populatedBooking = await ParcelBooking.findById(savedBooking._id)
      .populate({
        path: "user",
        select: "-password -__v -resetPasswordToken -resetPasswordExpire",
      })
      .lean();

    const pickupCoords = populatedBooking.pickupLocation?.coordinates;
    if (!pickupCoords || pickupCoords.includes(null)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pickup location coordinates",
      });
    }

    const nearbyRiders = await Rider.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: pickupCoords,
          },
          $maxDistance: 20000, // 20km radius
        },
      },
      isAvailable: true,
      isVerified: true,
    });

    // Notify each nearby rider via Pusher in real-time
    const pusherPayload = {
      bookingId: savedBooking._id,
      type: "parcel",
      status: "pending",
      pickupLocationName: savedBooking.pickupLocationName,
      dropoffLocationName: savedBooking.dropoffLocationName,
      fare: savedBooking.totalFare,
      distance: savedBooking.distance,
      estimatedTime: savedBooking.estimateTime,
      vehicleType: savedBooking.selectedVehicle,
      weight: savedBooking.weight,
      fragile: savedBooking.fragileItem,
      cargoType: savedBooking.cargoType,
      pickupCoords: {
        lat: pickupLocation.lat,
        lng: pickupLocation.lng,
      },
      timestamp: new Date().toISOString(),
    };

    // Trigger on a global parcel channel so all nearby drivers listening get it
    try {
      await pusher.trigger(
        "parcel-bookings",
        "new-parcel-booking",
        pusherPayload,
      );
    } catch (pusherError) {
      console.error(
        "Pusher trigger error (non-critical):",
        pusherError.message,
      );
    }

    // Also trigger on each individual rider's personal channel
    for (const rider of nearbyRiders) {
      try {
        await pusher.trigger(
          `rider-${rider._id}`,
          "new-parcel-booking",
          pusherPayload,
        );
      } catch (pusherError) {
        console.error(
          `Pusher error for rider ${rider._id}:`,
          pusherError.message,
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Parcel delivery booking created successfully",
      booking: {
        ...populatedBooking,
        paymentStatus: paymentIntent ? "authorized" : "pending",
        paymentType: paymentMethod === "Card" ? "Card" : "Cash",
        customerDetails: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
        },
      },
      summary: {
        bookingId: savedBooking._id,
        receiverName: savedBooking.receiverName,
        receiverPhone: savedBooking.receiverPhoneNumber,
        pickup: savedBooking.pickupLocationName,
        dropoff: savedBooking.dropoffLocationName,
        fare: savedBooking.totalFare,
        distance: savedBooking.distance,
        estimatedTime: savedBooking.estimateTime,
        vehicleType: savedBooking.selectedVehicle,
        fragile: savedBooking.fragileItem,
      },
      nearbyRiders,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Create parcel booking error:", error);
    if (error.type === "StripeCardError") {
      return res.status(400).json({
        success: false,
        message:
          "Your card was declined. Please use a different payment method.",
        error: error.message,
      });
    }

    if (error.code === "authentication_required") {
      return res.status(400).json({
        success: false,
        message: "Authentication required for this payment. Please try again.",
        requiresAuthentication: true,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

exports.getAllParcelBookings = async (req, res) => {
  try {
    const {
      status,
      startDate,
      endDate,
      limit = 100,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let filter = {};

    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const bookings = await ParcelBooking.aggregate([
      { $match: filter },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          user: "$userDetails",
        },
      },
      {
        $project: {
          userDetails: 0,
          "user.password": 0,
          "user.__v": 0,
          "user.resetPasswordToken": 0,
          "user.resetPasswordExpire": 0,
        },
      },
    ]);

    const totalBookings = await ParcelBooking.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total: totalBookings,
      page: parseInt(page),
      totalPages: Math.ceil(totalBookings / parseInt(limit)),
      bookings: bookings,
    });
  } catch (error) {
    console.error("Get all parcel bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getParcelBookingById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await ParcelBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Advanced Cancellation Endpoints

exports.cancelParcelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancellationReason, cancelledBy = "user" } = req.body;
    const userId = req.user._id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const booking = await ParcelBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this booking",
      });
    }

    const cancellableStatuses = ["pending", "accepted"];
    if (!cancellableStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled in '${booking.status}' status. Only 'pending' or 'accepted' bookings can be cancelled.`,
        currentStatus: booking.status,
      });
    }

    let paymentCancellationResult = null;

    if (booking.paymentIntentId && booking.paymentStatus === "authorized") {
      try {
        const cancelledPayment = await stripe.paymentIntents.cancel(
          booking.paymentIntentId,
        );

        paymentCancellationResult = {
          success: true,
          status: cancelledPayment.status,
          message: "Payment hold released successfully",
        };
        booking.paymentStatus = "cancelled";
      } catch (paymentError) {
        console.error("Payment cancel error:", paymentError);
        paymentCancellationResult = {
          success: false,
          error: paymentError.message,
          message:
            "Payment could not be released automatically. Please contact support.",
        };
      }
    }

    booking.status = "cancelled";
    booking.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledBy: cancelledBy,
      reason: cancellationReason || "No reason provided",
    };

    await booking.save();

    const updatedBooking = await ParcelBooking.findById(booking._id)
      .populate({
        path: "user",
        select: "-password -__v -resetPasswordToken -resetPasswordExpire",
      })
      .lean();

    if (booking.driver) {
      try {
        await Rider.findByIdAndUpdate(booking.driver, {
          status: "available",
          currentRide: null,
        });
        console.log(
          `Booking ${bookingId} cancelled. Driver ${booking.driver} set to available.`,
        );
      } catch (driverError) {
        console.error("Driver update error:", driverError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Parcel delivery cancelled successfully",
      booking: {
        ...updatedBooking,
        cancellationDetails: booking.cancellationDetails,
      },
      payment: paymentCancellationResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cancel parcel delivery error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.driverCancelParcelDelivery = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancellationReason } = req.body;
    const driverId = req.rider._id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const booking = await ParcelBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!booking.driver || booking.driver.toString() !== driverId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this booking",
      });
    }

    const cancellableStatuses = ["accepted", "onTheWay"];
    if (!cancellableStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled in '${booking.status}' status`,
        currentStatus: booking.status,
      });
    }

    let paymentCancellationResult = null;
    if (booking.paymentIntentId && booking.paymentStatus === "authorized") {
      try {
        const cancelledPayment = await stripe.paymentIntents.cancel(
          booking.paymentIntentId,
        );

        paymentCancellationResult = {
          success: true,
          status: cancelledPayment.status,
          message: "Payment hold released",
        };
        booking.paymentStatus = "cancelled";
      } catch (paymentError) {
        console.error("Payment cancel error:", paymentError);
        paymentCancellationResult = {
          success: false,
          error: paymentError.message,
          message: "Payment hold could not be released",
        };
      }
    }

    booking.status = "cancelled";
    booking.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledBy: "driver",
      reason: cancellationReason || "Driver cancelled",
    };
    booking.driver = null;

    await booking.save();

    try {
      await Rider.findByIdAndUpdate(driverId, {
        status: "available",
        currentRide: null,
      });
    } catch (driverError) {
      console.error("Driver update error:", driverError.message);
    }

    const updatedBooking = await ParcelBooking.findById(booking._id)
      .populate({
        path: "user",
        select: "-password -__v -resetPasswordToken -resetPasswordExpire",
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Parcel delivery cancelled successfully by driver",
      booking: updatedBooking,
      payment: paymentCancellationResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Driver cancel parcel delivery error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.adminCancelParcelDelivery = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancellationReason } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const booking = await ParcelBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Cancel payment if exists
    if (booking.paymentIntentId && booking.paymentStatus === "authorized") {
      try {
        await stripe.paymentIntents.cancel(booking.paymentIntentId);
        booking.paymentStatus = "cancelled";
      } catch (paymentError) {
        console.error("Payment cancel error:", paymentError);
      }
    }

    booking.status = "cancelled";
    booking.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledBy: "admin",
      reason: cancellationReason || "Admin cancelled",
    };

    await booking.save();

    if (booking.driver) {
      try {
        await Rider.findByIdAndUpdate(booking.driver, {
          status: "available",
          currentRide: null,
        });
      } catch (driverError) {
        console.error("Driver update error:", driverError.message);
      }
    }

    const updatedBooking = await ParcelBooking.findById(booking._id)
      .populate({
        path: "user",
        select: "-password -__v -resetPasswordToken -resetPasswordExpire",
      })
      .populate("driver", "name phone email")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Parcel delivery cancelled successfully by admin",
      booking: updatedBooking,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin cancel parcel delivery error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Driver Workflow Endpoints

exports.acceptParcelDelivery = async (req, res) => {
  try {
    const bookingId = req.params.bookingId || req.body.bookingId;
    const rider = req.rider;

    if (!rider) {
      return res.status(401).json({
        success: false,
        message: "Rider not authenticated. Please login again.",
      });
    }

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    if (rider.status === "busy") {
      return res.status(400).json({
        success: false,
        message: `You are not available to accept new deliveries. Current status: ${rider.status}`,
      });
    }

    if (!rider.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is not verified yet. Please wait for admin approval.",
        verificationStatus: rider.verificationStatus,
      });
    }

    // Find booking first
    const existingBooking = await ParcelBooking.findById(bookingId);

    if (!existingBooking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (existingBooking.user.toString() === rider.user.toString()) {
      return res
        .status(400)
        .json({
          success: false,
          message: "You cannot accept your own parcel delivery booking",
        });
    }

    if (existingBooking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This delivery is no longer available. Current status: ${existingBooking.status}`,
      });
    }

    if (existingBooking.driver) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Already accepted by another driver",
        });
    }

    if (existingBooking.paymentType === "Card") {
      if (!rider.stripeConnectAccountId) {
        return res.status(403).json({
          success: false,
          message:
            "Driver payment account not set up. Please complete Stripe Connect onboarding.",
          requiresConnectOnboarding: true,
        });
      }

      if (!rider.connectChargesEnabled) {
        return res.status(403).json({
          success: false,
          message:
            "Driver payment account not enabled. Please complete onboarding.",
          requiresConnectOnboarding: true,
        });
      }

      if (existingBooking.paymentIntentId) {
        const stripe = require("../config/stripe");
        const applicationFee = Math.round(existingBooking.fare * 0.2 * 100);
        await stripe.paymentIntents.update(existingBooking.paymentIntentId, {
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: rider.stripeConnectAccountId,
          },
          metadata: {
            driverId: rider._id.toString(),
            driverConnectAccountId: rider.stripeConnectAccountId,
          },
        });
      }
    }

    // Direct update
    await ParcelBooking.updateOne(
      { _id: bookingId },
      {
        $set: { status: "accepted", driver: rider._id, acceptedAt: new Date() },
      },
    );

    const booking = await ParcelBooking.findById(bookingId);

    // Update rider status atomically as well
    await Rider.findByIdAndUpdate(rider._id, {
      $set: { status: "busy", currentRide: booking._id },
    });

    const populatedBooking = await ParcelBooking.findById(booking._id)
      .populate("user", "name email phoneNumber profileImage")
      .populate({
        path: "driver",
        populate: { path: "user", select: "name email phoneNumber" },
      });

    try {
      await pusher.trigger(
        `parcel-delivery-${bookingId}`,
        "delivery-accepted",
        {
          bookingId: bookingId,
          status: "accepted",
          driver: {
            id: rider._id,
            name: rider.user?.name,
          },
          timestamp: new Date().toISOString(),
        },
      );
    } catch (pusherError) {
      console.error("Pusher error (non-critical):", pusherError.message);
    }

    res.status(200).json({
      success: true,
      message: "Parcel delivery accepted successfully",
      data: {
        booking: populatedBooking,
        rider: {
          id: rider._id,
          status: "busy",
          currentRide: booking._id,
        },
      },
    });
  } catch (error) {
    console.error("Accept parcel delivery error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.parcelDeliveryOnTheWay = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const riderId = req.rider?._id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Rider not authenticated",
      });
    }

    const booking = await ParcelBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!booking.driver || booking.driver.toString() !== riderId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this delivery",
      });
    }

    if (booking.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as on the way. Current status: ${booking.status}`,
      });
    }

    booking.status = "onTheWay";
    booking.onTheWayAt = new Date();

    if (!booking.statusHistory) {
      booking.statusHistory = [];
    }

    booking.statusHistory.push({
      status: "onTheWay",
      changedBy: riderId,
      userRole: "driver",
      reason: "Driver is on the way to pickup location",
      changedAt: new Date(),
    });

    await booking.save();

    try {
      await pusher.trigger(
        `parcel-delivery-${bookingId}`,
        "delivery-status-update",
        {
          bookingId: bookingId,
          status: "onTheWay",
          timestamp: new Date().toISOString(),
        },
      );
    } catch (pusherError) {
      console.error("Pusher error (non-critical):", pusherError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Driver is on the way to pickup",
      booking: {
        id: booking._id,
        status: booking.status,
        onTheWayAt: booking.onTheWayAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("On the way error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.parcelDeliveryReachedPickup = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const riderId = req.rider?._id;

    const booking = await ParcelBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!booking.driver || booking.driver.toString() !== riderId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this delivery",
      });
    }

    if (booking.status === "arrived") {
      return res.status(200).json({
        success: true,
        message: "Already at pickup location",
        booking: {
          id: booking._id,
          status: booking.status,
        },
      });
    }

    if (booking.status !== "onTheWay") {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as reached pickup. Current status: ${booking.status}`,
      });
    }

    booking.status = "arrived";
    booking.arrivedAt = new Date();

    await booking.save();

    try {
      await pusher.trigger(
        `parcel-delivery-${bookingId}`,
        "delivery-status-update",
        {
          bookingId: bookingId,
          status: "arrived",
          timestamp: new Date().toISOString(),
        },
      );
    } catch (pusherError) {
      console.error("Pusher error (non-critical):", pusherError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Driver reached pickup location",
      booking: {
        id: booking._id,
        status: booking.status,
        arrivedAt: booking.arrivedAt,
      },
    });
  } catch (error) {
    console.error("Reached pickup error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.startParcelDelivery = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const riderId = req.rider?._id;

    const booking = await ParcelBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!booking.driver || booking.driver.toString() !== riderId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this delivery",
      });
    }

    if (booking.status !== "arrived" && booking.status !== "onTheWay") {
      return res.status(400).json({
        success: false,
        message: `Cannot start delivery. Current status: ${booking.status}. Must be at pickup location.`,
      });
    }

    booking.status = "inProgress";
    booking.startedAt = new Date();

    if (!booking.statusHistory) {
      booking.statusHistory = [];
    }

    booking.statusHistory.push({
      status: "inProgress",
      changedBy: riderId,
      userRole: "driver",
      reason: "Parcel delivery started",
      changedAt: new Date(),
    });

    await booking.save();

    try {
      await pusher.trigger(
        `parcel-delivery-${bookingId}`,
        "delivery-status-update",
        {
          bookingId: bookingId,
          status: "inProgress",
          timestamp: new Date().toISOString(),
        },
      );
    } catch (pusherError) {
      console.error("Pusher trigger error:", pusherError);
    }

    return res.status(200).json({
      success: true,
      message: "Parcel delivery started successfully",
      booking: {
        id: booking._id,
        status: booking.status,
        startedAt: booking.startedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Start delivery error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.completeParcelDelivery = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const riderId = req.rider?._id;

    const booking = await ParcelBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!booking.driver || booking.driver.toString() !== riderId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this delivery",
      });
    }

    if (booking.status !== "inProgress") {
      return res.status(400).json({
        success: false,
        message: `Cannot complete delivery. Current status: ${booking.status}`,
      });
    }

    booking.status = "completed";
    booking.completedAt = new Date();

    if (!booking.statusHistory) {
      booking.statusHistory = [];
    }

    booking.statusHistory.push({
      status: "completed",
      changedBy: riderId,
      userRole: "driver",
      reason: "Parcel delivery completed",
      changedAt: new Date(),
    });

    // Capture payment if Card payment
    if (
      booking.paymentType === "Card" &&
      booking.paymentIntentId &&
      booking.paymentStatus === "authorized"
    ) {
      try {
        const paymentIntent = await stripe.paymentIntents.capture(
          booking.paymentIntentId,
        );
        booking.paymentStatus = "captured";
        console.log(
          `Payment captured for parcel delivery ${bookingId} - 80% automatically transferred to driver via Stripe Connect`,
        );
      } catch (paymentError) {
        console.error("Payment capture error:", paymentError.message);
        // Continue with completion even if payment capture fails
      }
    }

    await booking.save();

    try {
      await Rider.findOneAndUpdate(
        { user: riderId },
        {
          status: "available",
          currentRide: null,
          $inc: {
            totalRides: 1,
            totalEarning: parseFloat((booking.totalFare * 0.8).toFixed(2)),
          },
        },
        { new: true },
      );

      console.log(
        `Driver ${riderId} status updated to available (paid via Stripe Connect)`,
      );
    } catch (driverUpdateError) {
      console.error("Driver status update error:", driverUpdateError.message);
    }

    try {
      await pusher.trigger(
        `parcel-delivery-${bookingId}`,
        "delivery-status-update",
        {
          bookingId: bookingId,
          status: "completed",
          timestamp: new Date().toISOString(),
        },
      );

      await pusher.trigger("driver-status", "driver-available", {
        driverId: riderId,
        status: "available",
        timestamp: new Date().toISOString(),
      });
    } catch (pusherError) {
      console.error("Pusher error (non-critical):", pusherError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Parcel delivery completed successfully",
      booking: {
        id: booking._id,
        status: booking.status,
        completedAt: booking.completedAt,
        paymentStatus: booking.paymentStatus,
      },
      driverStatus: "available",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Complete delivery error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

function calculateDistanceFromCoords(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

exports.updateParcelDeliveryDriverLocation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { latitude, longitude } = req.body;
    const driverId = req.rider?._id;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const booking = await ParcelBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.driver.toString() !== driverId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this delivery",
      });
    }

    await Rider.findByIdAndUpdate(driverId, {
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      lastLocationUpdate: new Date(),
    });

    if (!booking.locationHistory) {
      booking.locationHistory = [];
    }
    booking.locationHistory.push({
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      timestamp: new Date(),
    });

    if (booking.locationHistory.length > 100) {
      booking.locationHistory.shift();
    }
    await booking.save();

    const channelName = `parcel-delivery-${bookingId}`;
    pusher.trigger(channelName, "driver-location-update", {
      driverId: driverId,
      latitude: latitude,
      longitude: longitude,
      timestamp: new Date().toISOString(),
      status: booking.status,
    });

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: {
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Location update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getParcelDeliveryDriverLocation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?._id;

    const booking = await ParcelBooking.findById(bookingId).populate(
      "driver",
      "name phoneNumber location profileImage vehicleDetails",
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if user is the customer of this delivery
    if (booking.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to track this delivery",
      });
    }

    // Check if delivery is active
    const activeStatuses = ["accepted", "onTheWay", "arrived", "inProgress"];
    if (!activeStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Delivery is not active for tracking. Current status: ${booking.status}`,
      });
    }

    const driverLocation = booking.driver?.location?.coordinates || null;

    // Calculate ETA
    let eta = null;
    if (driverLocation && booking.pickupLocation?.coordinates) {
      const distance = calculateDistanceFromCoords(
        driverLocation[1],
        driverLocation[0],
        booking.pickupLocation.coordinates[1],
        booking.pickupLocation.coordinates[0],
      );
      const estimatedMinutes = Math.ceil((distance / 30) * 60);
      eta = estimatedMinutes;
    }

    return res.status(200).json({
      success: true,
      data: {
        driver: {
          name: booking.driver?.name,
          phoneNumber: booking.driver?.phoneNumber,
          profileImage: booking.driver?.profileImage,
          vehicleDetails: booking.driver?.vehicleDetails,
        },
        currentLocation: driverLocation
          ? {
              latitude: driverLocation[1],
              longitude: driverLocation[0],
            }
          : null,
        eta: eta ? `${eta} minutes` : "Calculating...",
        deliveryStatus: booking.status,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Get location error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getParcelDeliveryLocationHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?._id;

    const booking = await ParcelBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Allow access to admin or delivery participants
    const isAdmin = req.user?.role === "admin";
    const isDriver = booking.driver?.toString() === userId?.toString();
    const isCustomer = booking.user?.toString() === userId?.toString();

    if (!isAdmin && !isDriver && !isCustomer) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        locationHistory: booking.locationHistory || [],
        totalUpdates: booking.locationHistory?.length || 0,
      },
    });
  } catch (error) {
    console.error("Location history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getNearbyParcelDeliveries = async (req, res) => {
  try {
    let { latitude, longitude, radius = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "latitude & longitude required",
        debug: { query: req.query },
      });
    }

    latitude = Number(latitude);
    longitude = Number(longitude);
    radius = Number(radius) * 1000; // Convert to meters

    const deliveries = await ParcelBooking.find({
      status: { $nin: ["completed", "cancelled", "reviewed"] },
      pickupLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: radius,
        },
      },
    })
      .populate("user", "name phone profileImage")
      .lean();

    const result = deliveries.map((delivery) => {
      const lng = delivery.pickupLocation.coordinates[0];
      const lat = delivery.pickupLocation.coordinates[1];

      const distance = calculateDistanceFromCoords(
        latitude,
        longitude,
        lat,
        lng,
      );

      return {
        ...delivery,
        distance: distance.toFixed(2) + " km",
      };
    });

    res.json({
      success: true,
      count: result.length,
      deliveries: result,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.getParcelDeliveryStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await ParcelBooking.findById(bookingId)
      .populate({
        path: "user",
        select: "name phone profileImage",
      })
      .populate({
        path: "driver",
        populate: {
          path: "user",
          select: "name phone",
        },
      })
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isUser = booking.user._id.toString() === userId.toString();
    const isDriver = booking.driver?._id?.toString() === userId.toString();

    if (!isUser && !isDriver && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this delivery",
      });
    }

    let driverLocation = null;
    if (
      booking.driver &&
      ["accepted", "onTheWay", "arrived", "inProgress"].includes(booking.status)
    ) {
      const rider = await Rider.findById(booking.driver._id);
      driverLocation = rider?.location?.coordinates || null;
    }

    const statusFlow = {
      current: booking.status,
      progress: getStatusProgress(booking.status),
      timestamps: {
        accepted: booking.acceptedAt,
        onTheWay: booking.onTheWayAt,
        arrived: booking.arrivedAt,
        started: booking.startedAt,
        completed: booking.completedAt,
      },
    };

    return res.status(200).json({
      success: true,
      booking: {
        ...booking,
        driverLocation,
        statusFlow,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get parcel delivery status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

function getStatusProgress(status) {
  const statusOrder = {
    pending: 0,
    accepted: 20,
    onTheWay: 40,
    arrived: 60,
    inProgress: 80,
    completed: 100,
    cancelled: 0,
    rejected: 0,
  };
  return statusOrder[status] || 0;
}

exports.getAllParcelDeliveriesForDriver = async (req, res) => {
  try {
    const driverId = req.user._id;
    const deliveries = await ParcelBooking.find({ driver: driverId })
      .populate("user", "name phone profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries,
    });
  } catch (error) {
    console.error("Get all parcel deliveries for driver error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getCancelledParcelDeliveries = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await ParcelBooking.find({
      user: userId,
      status: "cancelled",
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("driver", "name phone")
      .lean();

    const total = await ParcelBooking.countDocuments({
      user: userId,
      status: "cancelled",
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      total: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      bookings: bookings,
    });
  } catch (error) {
    console.error("Get cancelled parcel deliveries error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
