const RideBooking = require("../models/rideBooking");
const User = require("../models/user");
const Rider = require("../models/riderModel");
const parcelBooking = require("../models/parcelBooking");
const petDeliveryBooking = require("../models/petDeliveryBooking");

const calculateEstimatedArrival = (duration, startTime) => {
  const durationInMs = parseFloat(duration) * 60 * 1000;
  const arrivalTime = new Date(startTime.getTime() + durationInMs);
  return arrivalTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

exports.createRideBooking = async (req, res) => {
  try {
    const requiredFields = ["category", "pickupLocation"];
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

    const dropoffLocation =
      req.body.dropoffLocation || req.body.dropOffLocation;

    const rideBooking = new RideBooking({
      user: req.user._id,
      category: req.body.category,
      pickupLocation: req.body.pickupLocation,
      dropoffLocation: dropoffLocation,
      fare: req.body.fare,
      distance: req.body.distance,
      time: req.body.time,
      date: req.body.date || new Date().toISOString().split("T")[0],
      status: req.body.status || "pending",
      pickupLocationName: req.body.pickupLocationName,
      dropoffLocationName: req.body.dropoffLocationName,
      duration: req.body.duration,
      paymentMethod: req.body.paymentMethod || "cash",
      price: req.body.price,
    });

    const savedBooking = await rideBooking.save();
    const populatedBooking = await RideBooking.findById(savedBooking._id)
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
    });

    const estimatedArrival = calculateEstimatedArrival(
      populatedBooking.duration,
      new Date(),
    );

    return res.status(201).json({
      success: true,
      message: "Ride booked successfully",
      booking: {
        ...populatedBooking,
        estimatedArrival,

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
      },

      nearbyRiders,

      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Create ride error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,

      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

exports.getNearbyRides = async (req, res) => {
  try {
    let { latitude, longitude, radius = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "latitude & longitude required",
      });
    }

    latitude = Number(latitude);
    longitude = Number(longitude);
    radius = Number(radius) * 1000;

    console.log("User:", latitude, longitude);

    const rides = await RideBooking.find({
      pickupLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: radius,
        },
      },
    }).lean();

    console.log("Found rides:", rides.length);

    const result = rides.map((ride) => {
      const lng = ride.pickupLocation.coordinates[0];
      const lat = ride.pickupLocation.coordinates[1];

      const distance = calculateDistance(latitude, longitude, lat, lng);

      return {
        ...ride,
        distance: distance.toFixed(2) + " km",
      };
    });

    res.json({
      success: true,
      count: result.length,
      rides: result,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.getAllRides = async (req, res) => {
  try {
    const {
      status,
      category,
      startDate,
      endDate,
      limit = 100,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const rides = await RideBooking.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user", "name email phone")
      .lean();

    const totalRides = await RideBooking.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: rides.length,
      total: totalRides,
      page: parseInt(page),
      totalPages: Math.ceil(totalRides / parseInt(limit)),
      rides: rides,
    });
  } catch (error) {
    console.error("Get all rides error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.debugNearbyRides = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    const allRides = await RideBooking.find({});
    const results = [];

    for (const ride of allRides) {
      let rideLat, rideLng;

      if (ride.pickupLocation && ride.pickupLocation.lat) {
        rideLat = ride.pickupLocation.lat;
        rideLng = ride.pickupLocation.lng;

        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          rideLat,
          rideLng,
        );

        results.push({
          rideId: ride._id,
          rideLocation: { lat: rideLat, lng: rideLng },
          pickupName: ride.pickupLocationName,
          distance: distance.toFixed(2) + "km",
          within20km: distance <= 20,
        });
      }
    }

    res.json({
      yourLocation: { latitude, longitude },
      totalRides: allRides.length,
      ridesWithDistance: results,
      nearbyCount: results.filter((r) => r.within20km).length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllRidesForDriver = async (req, res) => {
  try {
    const driverId = req.user._id;
    const rides = await RideBooking.find({ driver: driverId });
    res.status(200).json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error("Get all rides for driver error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.cancelRideBooking = async (req, res) => {
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

    booking.status = "cancelled";
    booking.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledBy: cancelledBy,
      reason: cancellationReason || "No reason provided",
    };

    await booking.save();

    const updatedBooking = await RideBooking.findById(booking._id)
      .populate({
        path: "user",
        select: "-password -__v -resetPasswordToken -resetPasswordExpire",
      })
      .lean();

    if (booking.driver) {
      console.log(
        `Booking ${bookingId} cancelled. Driver ${booking.driver} notified.`,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Ride cancelled successfully",
      booking: {
        ...updatedBooking,
        cancellationDetails: booking.cancellationDetails,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cancel ride error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.driverCancelRideBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancellationReason } = req.body;
    const driverId = req.user._id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const booking = await RideBooking.findById(bookingId);

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

    const cancellableStatuses = ["accepted", "ongoing"];
    if (!cancellableStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled in '${booking.status}' status`,
        currentStatus: booking.status,
      });
    }

    booking.status = "cancelled";
    booking.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledBy: "driver",
      reason: cancellationReason || "Driver cancelled",
    };
    booking.driver = null;

    await booking.save();

    const updatedBooking = await RideBooking.findById(booking._id)
      .populate({
        path: "user",
        select: "-password -__v -resetPasswordToken -resetPasswordExpire",
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Ride cancelled successfully by driver",
      booking: updatedBooking,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Driver cancel ride error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.adminCancelRideBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancellationReason } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const booking = await RideBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.status = "cancelled";
    booking.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledBy: "admin",
      reason: cancellationReason || "Admin cancelled",
    };

    await booking.save();

    const updatedBooking = await RideBooking.findById(booking._id)
      .populate({
        path: "user",
        select: "-password -__v -resetPasswordToken -resetPasswordExpire",
      })
      .populate("driver", "name phone email")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Ride cancelled successfully by admin",
      booking: updatedBooking,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin cancel ride error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getCancelledBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await RideBooking.find({
      user: userId,
      status: "cancelled",
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await RideBooking.countDocuments({
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
    console.error("Get cancelled bookings error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getUserRideHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const cabRides = await RideBooking.find({ user: userId });
    const parcelRides = await parcelBooking.find({ user: userId });
    const petRides = await petDeliveryBooking.find({ user: userId });

    const formattedCab = cabRides.map((ride) => ({
      id: ride._id,
      type: "cab",
      pickupLocation: ride.pickupLocation,
      dropOffLocation: ride.dropoffLocation,
      pickupLocationName: ride.pickupLocationName,
      dropoffLocationName: ride.dropoffLocationName,
      price: ride.price,
      status: ride.status,
      created_at: ride.created_at,
    }));

    const formattedParcel = parcelRides.map((ride) => ({
      id: ride._id,
      type: "parcel",
      pickupLocation: ride.pickupLocation,
      dropOffLocation: ride.dropoffLocation,
      pickupLocationName: ride.pickupLocationName,
      dropoffLocationName: ride.dropoffLocationName,
      price: ride.price,
      status: ride.status,
      created_at: ride.created_at,
    }));

    const formattedPet = petRides.map((ride) => ({
      id: ride._id,
      type: "pet",
      pickupLocation: ride.pickupLocation,
      dropOffLocation: ride.dropOffLocation,
      pickupLocationName: ride.pickupLocationName,
      dropoffLocationName: ride.dropoffLocationName,
      price: ride.price,
      status: ride.status,
      created_at: ride.created_at,
    }));

    const allRides = [
      ...formattedCab,
      ...formattedParcel,
      ...formattedPet,
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.status(200).json({
      message: "User ride history fetched successfully",
      data: allRides,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.acceptRide = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    console.log("USER:", req.user);

    const booking = await RideBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This ride is no longer available. Current status: ${booking.status}`,
      });
    }

    const rider = await Rider.findOne({ userId: userId });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found for this user",
      });
    }

    if (rider.isAvailable === false) {
      return res.status(400).json({
        success: false,
        message: "You are currently unavailable to accept rides",
      });
    }

    booking.status = "accepted";

    booking.driver = rider._id;

    booking.acceptedAt = new Date();

    if (!booking.statusHistory) booking.statusHistory = [];

    booking.statusHistory.push({
      status: "accepted",
      changedBy: rider._id,
      userRole: "driver",
      reason: "Ride accepted by rider",
      changedAt: new Date(),
    });

    await booking.save();

    const updatedBooking = await RideBooking.findById(booking._id)
      .populate({
        path: "user",
        select: "name email phone profileImage",
      })
      .populate({
        path: "driver",
        populate: {
          path: "userId",
          select: "name email phoneNumber profileImage",
        },
      })
      .lean();

    const riderDetails = await Rider.findById(rider._id)
      .select("vehicleDetails rating totalRides location isAvailable")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Ride accepted successfully",
      booking: {
        ...updatedBooking,
        riderInfo: {
          id: rider._id,
          name: req.user.name,
          phone: req.user.phoneNumber,
          email: req.user.email,
          profileImage: req.user.profileImage,
          vehicleDetails: riderDetails?.vehicleDetails || {},
          rating: riderDetails?.rating || 0,
          totalRides: riderDetails?.totalRides || 0,
          currentLocation: riderDetails?.location?.coordinates || null,
        },
      },
      estimatedPickupTime: calculateEstimatedArrival(
        booking.duration,
        new Date(),
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Accept ride error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.riderOnTheWay = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { currentLocation } = req.body;
    const riderId = req.user._id;

    const booking = await RideBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!booking.driver || booking.driver.toString() !== riderId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this ride",
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

    if (currentLocation && currentLocation.coordinates) {
      await Rider.findByIdAndUpdate(riderId, {
        location: {
          type: "Point",
          coordinates: currentLocation.coordinates,
        },
      });
    }

    booking.statusHistory.push({
      status: "onTheWay",
      changedBy: riderId,
      userRole: "driver",
      reason: "Rider is on the way to pickup location",
      changedAt: new Date(),
    });

    await booking.save();

    const riderLocation =
      currentLocation?.coordinates ||
      (await Rider.findById(riderId)).location?.coordinates;

    const pickupCoords = booking.pickupLocation.coordinates;
    let estimatedArrival = null;

    if (riderLocation && pickupCoords) {
      const distanceToPickup = calculateDistance(
        riderLocation[1],
        riderLocation[0],
        pickupCoords[1],
        pickupCoords[0],
      );
      const estimatedMinutes = (distanceToPickup / 30) * 60;
      estimatedArrival = new Date(
        Date.now() + estimatedMinutes * 60000,
      ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    return res.status(200).json({
      success: true,
      message: "Rider is on the way to pickup",
      booking: {
        id: booking._id,
        status: booking.status,
        onTheWayAt: booking.onTheWayAt,
      },
      estimatedArrivalAtPickup: estimatedArrival || "Calculating...",
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

exports.reachedPickup = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const riderId = req.user._id;

    const booking = await RideBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!booking.driver || booking.driver.toString() !== riderId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this ride",
      });
    }

    if (booking.status !== "onTheWay") {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as reached pickup. Current status: ${booking.status}`,
      });
    }

    booking.status = "reachedPickup";
    booking.reachedPickupAt = new Date();

    booking.statusHistory.push({
      status: "reachedPickup",
      changedBy: riderId,
      userRole: "driver",
      reason: "Rider reached pickup location",
      changedAt: new Date(),
    });

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Rider reached pickup location",
      booking: {
        id: booking._id,
        status: booking.status,
        reachedPickupAt: booking.reachedPickupAt,
      },
      timestamp: new Date().toISOString(),
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

exports.startRide = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const riderId = req.user._id;

    const booking = await RideBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!booking.driver || booking.driver.toString() !== riderId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this ride",
      });
    }

    if (booking.status !== "reachedPickup") {
      return res.status(400).json({
        success: false,
        message: `Cannot start ride. Current status: ${booking.status}`,
      });
    }

    booking.status = "ongoing";
    booking.startedAt = new Date();

    booking.statusHistory.push({
      status: "ongoing",
      changedBy: riderId,
      userRole: "driver",
      reason: "Ride started",
      changedAt: new Date(),
    });

    await booking.save();

    const estimatedArrival = calculateEstimatedArrival(
      booking.duration,
      new Date(),
    );

    return res.status(200).json({
      success: true,
      message: "Ride started successfully",
      booking: {
        id: booking._id,
        status: booking.status,
        startedAt: booking.startedAt,
        estimatedArrival: estimatedArrival,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Start ride error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.completeRide = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const riderId = req.user._id;

    const booking = await RideBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!booking.driver || booking.driver.toString() !== riderId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this ride",
      });
    }

    if (booking.status !== "ongoing") {
      return res.status(400).json({
        success: false,
        message: `Cannot complete ride. Current status: ${booking.status}`,
      });
    }

    booking.status = "completed";
    booking.completedAt = new Date();

    booking.statusHistory.push({
      status: "completed",
      changedBy: riderId,
      userRole: "driver",
      reason: "Ride completed",
      changedAt: new Date(),
    });

    await booking.save();

    await Rider.findByIdAndUpdate(riderId, {
      $inc: { totalRides: 1 },
      $set: { isAvailable: true },
    });

    return res.status(200).json({
      success: true,
      message: "Ride completed successfully",
      booking: {
        id: booking._id,
        status: booking.status,
        completedAt: booking.completedAt,
        fare: booking.fare,
        distance: booking.distance,
        duration: booking.duration,
      },
      summary: {
        totalTime:
          Math.round((booking.completedAt - booking.startedAt) / 60000) +
          " minutes",
        amount: booking.fare,
        paymentMethod: booking.paymentMethod,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Complete ride error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getRideStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await RideBooking.findById(bookingId)
      .populate({
        path: "user",
        select: "name phone profileImage",
      })
      .populate({
        path: "driver",
        populate: {
          path: "riderId",
          select: "vehicleDetails rating phone",
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
        message: "Not authorized to view this ride",
      });
    }

    let riderLocation = null;
    if (
      booking.driver &&
      ["accepted", "onTheWay", "reachedPickup", "ongoing"].includes(
        booking.status,
      )
    ) {
      const rider = await Rider.findById(booking.driver._id);
      riderLocation = rider?.location?.coordinates || null;
    }

    const statusFlow = {
      current: booking.status,
      progress: getStatusProgress(booking.status),
      timestamps: {
        accepted: booking.acceptedAt,
        onTheWay: booking.onTheWayAt,
        reachedPickup: booking.reachedPickupAt,
        started: booking.startedAt,
        completed: booking.completedAt,
      },
    };

    return res.status(200).json({
      success: true,
      booking: {
        ...booking,
        riderLocation,
        statusFlow,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get ride status error:", error);
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
    reachedPickup: 60,
    ongoing: 80,
    completed: 100,
    cancelled: 0,
    rejected: 0,
  };
  return statusOrder[status] || 0;
}
