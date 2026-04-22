const mongoose = require("mongoose");
const PetDeliveryBooking = require("../models/petDeliveryBooking");
const User = require("../models/user");
const Rider = require("../models/riderModel");
const stripe = require("../config/stripe");
const pusher = require("../config/pusher");

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
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

// Helper function to calculate estimated arrival time
const calculateEstimatedArrival = (duration, startTime) => {
  const durationInMs = parseFloat(duration) * 60 * 1000;
  const arrivalTime = new Date(startTime.getTime() + durationInMs);
  return arrivalTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper function to calculate pet delivery fare
function calculatePetDeliveryFare(
  distance,
  weight_kg,
  carrier_required,
  special_instructions,
) {
  const baseFare = 5.0;
  const perKmRate = 2.0;
  const weightSurcharge = weight_kg > 20 ? (weight_kg - 20) * 0.5 : 0;
  const carrierFee = carrier_required ? 10.0 : 0;
  const specialHandlingFee = special_instructions ? 5.0 : 0;
  const distanceCharge = distance * perKmRate;
  const totalFare =
    baseFare +
    distanceCharge +
    weightSurcharge +
    carrierFee +
    specialHandlingFee;
  return parseFloat(totalFare.toFixed(2));
}

// Helper function to normalize dropoff location
function normalizeDropoffLocation(dropoffLocation) {
  if (!dropoffLocation) return null;

  // If it's GeoJSON format
  if (dropoffLocation.type === "Point" && dropoffLocation.coordinates) {
    const [lng, lat] = dropoffLocation.coordinates;
    return { lat, lng };
  }

  // If it's already lat/lng format
  if (
    typeof dropoffLocation.lat === "number" &&
    typeof dropoffLocation.lng === "number"
  ) {
    return dropoffLocation;
  }

  // If lat/lng are strings, convert to numbers
  if (dropoffLocation.lat && dropoffLocation.lng) {
    return {
      lat: parseFloat(dropoffLocation.lat),
      lng: parseFloat(dropoffLocation.lng),
    };
  }

  return null;
}

exports.createPetDeliveryBooking = async (req, res) => {
  try {
    const requiredFields = [
      "pet_name",
      "pet_type",
      "owner_name",
      "owner_phone",
      "pickupLocation",
      "pickupLocationName",
      "dropoffLocationName",
    ];

    for (let field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    if (!req.body.dropoffLocation && !req.body.dropOffLocation) {
      return res.status(400).json({
        success: false,
        message: "Dropoff location is required",
      });
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (req.body.paymentMethod === "Card" && !user.defaultPaymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Please add a payment method before booking",
        requiresPaymentSetup: true,
      });
    }

    const dropoffLocationRaw =
      req.body.dropoffLocation || req.body.dropOffLocation;
    const normalizedDropoffLocation =
      normalizeDropoffLocation(dropoffLocationRaw);

    if (!normalizedDropoffLocation) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid dropoff location format. Please provide valid coordinates",
      });
    }

    let fare = req.body.fare || req.body.price || 0;
    if (!fare && req.body.distance) {
      const distance = parseFloat(req.body.distance);
      const weight = parseFloat(req.body.weight_kg) || 0;
      fare = calculatePetDeliveryFare(
        distance,
        weight,
        req.body.carrier_required || false,
        req.body.special_instructions,
      );
    }

    let paymentIntent = null;

    if (req.body.paymentMethod === "Card") {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(fare * 100),
        currency: "usd",
        customer: user.stripeCustomerId,
        payment_method: user.defaultPaymentMethod,
        capture_method: "manual",
        metadata: {
          bookingType: "pet_delivery",
          userId: req.user._id.toString(),
          petName: req.body.pet_name,
          petType: req.body.pet_type,
          pickupLocation: JSON.stringify(req.body.pickupLocation),
          dropLocation: JSON.stringify(normalizedDropoffLocation),
          fare: fare.toString(),
        },
        confirm: true,
        off_session: true,
      });
    }

    const petDeliveryBooking = new PetDeliveryBooking({
      user: req.user._id,
      pet_name: req.body.pet_name,
      pet_type: req.body.pet_type,
      breed: req.body.breed,
      age: req.body.age,
      weight_kg: req.body.weight_kg,
      number_of_pets: req.body.number_of_pets,
      carrier_required: req.body.carrier_required || false,
      is_vaccinated: req.body.is_vaccinated || false,
      medical_conditions: req.body.medical_conditions,
      special_instructions: req.body.special_instructions,
      length_cm: req.body.length_cm,
      width_cm: req.body.width_cm,
      height_cm: req.body.height_cm,
      owner_name: req.body.owner_name,
      owner_phone: req.body.owner_phone,
      pickupLocation: req.body.pickupLocation,
      dropoffLocation: normalizedDropoffLocation,
      pickupLocationName: req.body.pickupLocationName,
      dropoffLocationName: req.body.dropoffLocationName,
      distance: req.body.distance,
      time: req.body.time,
      duration: req.body.duration,
      fare: fare.toString(),
      price: fare,
      paymentIntentId: paymentIntent ? paymentIntent.id : null,
      paymentStatus: paymentIntent ? "authorized" : "pending",
      paymentType: req.body.paymentMethod === "Card" ? "Card" : "Cash",
      paymentMethod: req.body.paymentMethod || "Cash",
      status: "pending",
    });

    const savedBooking = await petDeliveryBooking.save();
    const populatedBooking = await PetDeliveryBooking.findById(savedBooking._id)
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
          $maxDistance: 20000,
        },
      },
      isAvailable: true,
      isVerified: true,
    });

    const estimatedArrival = calculateEstimatedArrival(
      populatedBooking.duration || "30",
      new Date(),
    );

    // Pusher — notify all nearby drivers in realtime
    const pusherPayload = {
      bookingId: savedBooking._id,
      type: "pet",
      status: "pending",
      pickupLocationName: populatedBooking.pickupLocationName,
      dropoffLocationName: populatedBooking.dropoffLocationName,
      fare: populatedBooking.fare,
      distance: populatedBooking.distance,
      petName: req.body.pet_name,
      petType: req.body.pet_type,
      pickupCoords,
      timestamp: new Date().toISOString(),
    };

    // Global pet channel — driver app subscribe kare
    try {
      await pusher.trigger("pet-bookings", "new-pet-booking", pusherPayload);
    } catch (pusherError) {
      console.error("Pusher global trigger error (non-critical):", pusherError.message);
    }

    // Individual rider channels
    for (const rider of nearbyRiders) {
      try {
        await pusher.trigger(`rider-${rider._id}`, "new-pet-booking", pusherPayload);
      } catch (pusherError) {
        console.error(`Pusher error for rider ${rider._id}:`, pusherError.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Pet delivery booking created successfully",
      booking: {
        ...populatedBooking,
        estimatedArrival,
        paymentStatus: paymentIntent ? "authorized" : "pending",
        paymentType: req.body.paymentMethod === "Card" ? "Card" : "Cash",
        customerDetails: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
        },
      },
      summary: {
        bookingId: populatedBooking._id,
        pickup: populatedBooking.pickupLocationName,
        dropoff: populatedBooking.dropoffLocationName,
        fare: populatedBooking.fare,
        distance: populatedBooking.distance,
        duration: populatedBooking.duration,
        customerName: user.name,
        customerPhone: user.phone,
        petName: req.body.pet_name,
        petType: req.body.pet_type,
      },
      nearbyRiders,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Create pet delivery error:", error);
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

exports.getAllPetDeliveryBookings = async (req, res) => {
  try {
    const bookings = await PetDeliveryBooking.find().sort({ created_at: -1 });
    res.status(200).json({
      message: "Pet delivery bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getPetDeliveryBookingById = async (req, res) => {
  try {
    const booking = await PetDeliveryBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        message: "Pet delivery booking not found",
      });
    }
    res.status(200).json({
      message: "Booking fetched successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.cancelPetDeliveryBooking = async (req, res) => {
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

    const booking = await PetDeliveryBooking.findById(bookingId);

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

    const updatedBooking = await PetDeliveryBooking.findById(booking._id)
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
      message: "Pet delivery cancelled successfully",
      booking: {
        ...updatedBooking,
        cancellationDetails: booking.cancellationDetails,
      },
      payment: paymentCancellationResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cancel pet delivery error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.driverCancelPetDelivery = async (req, res) => {
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

    const booking = await PetDeliveryBooking.findById(bookingId);

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

    const updatedBooking = await PetDeliveryBooking.findById(booking._id)
      .populate({
        path: "user",
        select: "-password -__v -resetPasswordToken -resetPasswordExpire",
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Pet delivery cancelled successfully by driver",
      booking: updatedBooking,
      payment: paymentCancellationResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Driver cancel pet delivery error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.adminCancelPetDelivery = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancellationReason } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const booking = await PetDeliveryBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

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

    const updatedBooking = await PetDeliveryBooking.findById(booking._id)
      .populate({
        path: "user",
        select: "-password -__v -resetPasswordToken -resetPasswordExpire",
      })
      .populate("driver", "name phone email")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Pet delivery cancelled successfully by admin",
      booking: updatedBooking,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin cancel pet delivery error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// MAIN FIXED FUNCTION - acceptPetDelivery
exports.acceptPetDelivery = async (req, res) => {
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
        message: "Your account is not verified yet. Please wait for admin approval.",
        verificationStatus: rider.verificationStatus,
      });
    }

    // Find booking first
    const existingBooking = await PetDeliveryBooking.findById(bookingId);

    if (!existingBooking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (
      existingBooking.user &&
      rider.user &&
      existingBooking.user.toString() === rider.user.toString()
    ) {
      return res.status(400).json({ success: false, message: "You cannot accept your own booking" });
    }

    if (existingBooking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This delivery is no longer available. Current status: ${existingBooking.status}`,
      });
    }

    if (existingBooking.driver) {
      return res.status(400).json({ success: false, message: "Already accepted by another driver" });
    }

    if (existingBooking.paymentType === "Card") {
      if (!rider.stripeConnectAccountId) {
        return res.status(403).json({
          success: false,
          message: "Driver payment account not set up. Please complete Stripe Connect onboarding.",
          requiresConnectOnboarding: true,
        });
      }

      if (!rider.connectChargesEnabled) {
        return res.status(403).json({
          success: false,
          message: "Driver payment account not enabled. Please complete onboarding.",
          requiresConnectOnboarding: true,
        });
      }

      if (existingBooking.paymentIntentId) {
        const stripe = require('../config/stripe');
        const applicationFee = Math.round(existingBooking.fare * 0.20 * 100);
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

    // Direct update — no condition matching issues
    await PetDeliveryBooking.updateOne(
      { _id: bookingId },
      { $set: { status: "accepted", driver: rider._id, acceptedAt: new Date() } }
    );

    const booking = await PetDeliveryBooking.findById(bookingId);

    // Update rider status
    await Rider.findByIdAndUpdate(rider._id, {
      $set: { status: "busy", currentRide: booking._id },
    });

    const populatedBooking = await PetDeliveryBooking.findById(booking._id)
      .populate("user", "name email phoneNumber profileImage")
      .populate({
        path: "driver",
        populate: { path: "user", select: "name email phoneNumber" },
      });

    try {
      await pusher.trigger(`pet-delivery-${bookingId}`, "delivery-accepted", {
        bookingId: bookingId,
        status: "accepted",
        driver: { id: rider._id, name: rider.user?.name },
        timestamp: new Date().toISOString(),
      });
    } catch (pusherError) {
      console.error("Pusher error (non-critical):", pusherError.message);
    }

    res.status(200).json({
      success: true,
      message: "Pet delivery accepted successfully",
      data: {
        booking: populatedBooking,
        rider: { id: rider._id, status: "busy", currentRide: booking._id },
      },
    });
  } catch (error) {
    console.error("Accept pet delivery error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.petDeliveryOnTheWay = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const riderId = req.rider?._id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Rider not authenticated",
      });
    }

    const booking = await PetDeliveryBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (!booking.driver || booking.driver.toString() !== riderId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this delivery",
        debug: {
          bookingDriver: booking.driver?.toString() || "null",
          yourRiderId: riderId?.toString(),
          bookingStatus: booking.status,
        },
      });
    }

    if (booking.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as on the way. Current status: ${booking.status}`,
      });
    }

    await PetDeliveryBooking.updateOne(
      { _id: bookingId },
      {
        $set: {
          status: "onTheWay",
          onTheWayAt: new Date(),
        },
        $push: {
          statusHistory: {
            status: "onTheWay",
            changedBy: riderId,
            userRole: "driver",
            reason: "Driver is on the way to pickup location",
            changedAt: new Date(),
          },
        },
      }
    );

    // Refresh booking for response
    const updatedBooking = await PetDeliveryBooking.findById(bookingId);

    try {
      await pusher.trigger(
        `pet-delivery-${bookingId}`,
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
        id: updatedBooking._id,
        status: updatedBooking.status,
        onTheWayAt: updatedBooking.onTheWayAt,
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

exports.petDeliveryReachedPickup = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const riderId = req.rider?._id;

    const booking = await PetDeliveryBooking.findById(bookingId);
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

    const arrivedAt = new Date();
    await PetDeliveryBooking.updateOne(
      { _id: bookingId },
      { $set: { status: "arrived", arrivedAt } }
    );

    try {
      await pusher.trigger(
        `pet-delivery-${bookingId}`,
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
        status: "arrived",
        arrivedAt,
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

exports.startPetDelivery = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const riderId = req.rider?._id;

    const booking = await PetDeliveryBooking.findById(bookingId);
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

    const startedAt = new Date();
    await PetDeliveryBooking.updateOne(
      { _id: bookingId },
      {
        $set: { status: "inProgress", startedAt },
        $push: {
          statusHistory: {
            status: "inProgress",
            changedBy: riderId,
            userRole: "driver",
            reason: "Pet delivery started",
            changedAt: new Date(),
          },
        },
      }
    );

    try {
      await pusher.trigger(
        `pet-delivery-${bookingId}`,
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
      message: "Pet delivery started successfully",
      booking: {
        id: booking._id,
        status: "inProgress",
        startedAt,
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

exports.completePetDelivery = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const riderId = req.rider?._id;

    const booking = await PetDeliveryBooking.findById(bookingId);
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

    const completedAt = new Date();
    let finalPaymentStatus = booking.paymentStatus;

    if (
      booking.paymentType === "Card" &&
      booking.paymentIntentId &&
      booking.paymentStatus === "authorized"
    ) {
      try {
        await stripe.paymentIntents.capture(booking.paymentIntentId);
        finalPaymentStatus = "captured";
        console.log(`Payment captured for pet delivery ${bookingId} - 80% automatically transferred to driver via Stripe Connect`);
      } catch (paymentError) {
        console.error("Payment capture error:", paymentError.message);
      }
    }

    await PetDeliveryBooking.updateOne(
      { _id: bookingId },
      {
        $set: {
          status: "completed",
          completedAt,
          paymentStatus: finalPaymentStatus,
        },
        $push: {
          statusHistory: {
            status: "completed",
            changedBy: riderId,
            userRole: "driver",
            reason: "Pet delivery completed",
            changedAt: new Date(),
          },
        },
      }
    );

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
      console.log(`Driver ${riderId} status updated to available (paid via Stripe Connect)`);
    } catch (driverUpdateError) {
      console.error("Driver status update error:", driverUpdateError.message);
    }

    try {
      await pusher.trigger(
        `pet-delivery-${bookingId}`,
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
      message: "Pet delivery completed successfully",
      booking: {
        id: booking._id,
        status: "completed",
        completedAt,
        paymentStatus: finalPaymentStatus,
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

exports.updatePetDeliveryDriverLocation = async (req, res) => {
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

    const booking = await PetDeliveryBooking.findById(bookingId);
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

    const newLocationEntry = {
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      timestamp: new Date(),
    };

    // Keep only last 100 entries — use $push with $slice
    await PetDeliveryBooking.updateOne(
      { _id: bookingId },
      {
        $push: {
          locationHistory: {
            $each: [newLocationEntry],
            $slice: -100,
          },
        },
      }
    );

    const channelName = `pet-delivery-${bookingId}`;
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

exports.getPetDeliveryDriverLocation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?._id;

    const booking = await PetDeliveryBooking.findById(bookingId).populate(
      "driver",
      "name phoneNumber location profileImage vehicleDetails",
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to track this delivery",
      });
    }

    const activeStatuses = ["accepted", "onTheWay", "arrived", "inProgress"];
    if (!activeStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Delivery is not active for tracking. Current status: ${booking.status}`,
      });
    }

    const driverLocation = booking.driver?.location?.coordinates || null;

    let eta = null;
    if (driverLocation && booking.pickupLocation?.coordinates) {
      const distance = calculateDistance(
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

exports.getPetDeliveryLocationHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?._id;

    const booking = await PetDeliveryBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

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

exports.getNearbyPetDeliveries = async (req, res) => {
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
    radius = Number(radius) * 1000;

    const deliveries = await PetDeliveryBooking.find({
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
      const distance = calculateDistance(latitude, longitude, lat, lng);
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

exports.getPetDeliveryStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await PetDeliveryBooking.findById(bookingId)
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
    console.error("Get pet delivery status error:", error);
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

exports.getAllPetDeliveriesForDriver = async (req, res) => {
  try {
    const driverId = req.user._id;
    const deliveries = await PetDeliveryBooking.find({ driver: driverId })
      .populate("user", "name phone profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries,
    });
  } catch (error) {
    console.error("Get all pet deliveries for driver error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getCancelledPetDeliveries = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await PetDeliveryBooking.find({
      user: userId,
      status: "cancelled",
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("driver", "name phone")
      .lean();

    const total = await PetDeliveryBooking.countDocuments({
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
    console.error("Get cancelled pet deliveries error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
