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
  const distance = R * c;
  return distance;
}

exports.createRideBooking = async (req, res) => {
  try {
    const {
      category,
      pickupLocation,
      dropOffLocation,
      dropoffLocation,
      pickupLocationName,
      dropoffLocationName,
      distance,
      time,
      duration,
      date,
      status,
      paymentMethod,
      price,
      fare,
      selectedVehicle,
      user: userId,
    } = req.body;

    if (!category || !pickupLocation) {
      return res.status(400).json({
        success: false,
        message: "Category and pickup location are required",
      });
    }

    const finalDropoffLocation = dropoffLocation || dropOffLocation;

    if (
      !finalDropoffLocation ||
      !finalDropoffLocation.lat ||
      !finalDropoffLocation.lng
    ) {
      return res.status(400).json({
        success: false,
        message: "Dropoff location with lat and lng is required",
      });
    }

    const user = await User.findById(req.user._id || userId).select(
      "-password",
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const rideBooking = new RideBooking({
      user: user._id,
      category: category,
      selectedVehicle: selectedVehicle,
      pickupLocation: {
        type: "Point",
        coordinates: [
          parseFloat(pickupLocation.lng),
          parseFloat(pickupLocation.lat),
        ],
      },
      dropoffLocation: {
        lat: parseFloat(finalDropoffLocation.lat),
        lng: parseFloat(finalDropoffLocation.lng),
      },
      pickupLocationName: pickupLocationName,
      dropoffLocationName: dropoffLocationName,
      fare: fare || price?.toString() || "0",
      distance: distance?.toString() || "0",
      time: time?.toString() || duration?.toString() || "0",
      date: date || new Date().toISOString().split("T")[0],
      status: status || "pending",
      duration: duration?.toString() || time?.toString() || "0",
      paymentMethod: paymentMethod || "cash",
      price: price?.toString() || fare?.toString() || "0",
      paymentStatus: "pending",
      paymentType: paymentMethod === "card" ? "Card" : "Cash",
    });

    console.log("Saving booking with data:", rideBooking);

    const savedBooking = await rideBooking.save();

    const populatedBooking = await RideBooking.findById(savedBooking._id)
      .populate({
        path: "user",
        select: "-password -__v -resetPasswordToken -resetPasswordExpire",
      })
      .lean();

    const nearbyRiders = await Rider.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [
              parseFloat(pickupLocation.lng),
              parseFloat(pickupLocation.lat),
            ],
          },
          $maxDistance: 5000,
        },
      },
    }).limit(10);

    return res.status(201).json({
      success: true,
      message: "Ride booked successfully",
      booking: {
        ...populatedBooking,
        customerDetails: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      },
      nearbyRiders: nearbyRiders,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Create ride error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.keys(error.errors).map((key) => ({
          field: key,
          message: error.errors[key].message,
          value: error.errors[key].value,
        })),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getNearbyRides = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const allRides = await RideBooking.find({}).lean(); // .lean() use karo
    const nearbyRides = [];

    console.log("=== DEBUG START ===");
    console.log("Total rides found:", allRides.length);
    console.log("Your location:", { latitude, longitude });

    for (const ride of allRides) {
      console.log(`\nRide ID: ${ride._id}`);
      console.log("PickupLocation raw:", ride.pickupLocation);

      // Direct access without parseFloat
      if (
        ride.pickupLocation &&
        ride.pickupLocation.lat !== undefined &&
        ride.pickupLocation.lng !== undefined
      ) {
        // Convert to number by adding 0 or using Number()
        const rideLat = Number(ride.pickupLocation.lat);
        const rideLng = Number(ride.pickupLocation.lng);

        console.log("Converted lat/lng:", { rideLat, rideLng });
        console.log("Type check:", {
          latType: typeof ride.pickupLocation.lat,
          lngType: typeof ride.pickupLocation.lng,
        });

        if (!isNaN(rideLat) && !isNaN(rideLng)) {
          const distance = calculateDistance(
            Number(latitude),
            Number(longitude),
            rideLat,
            rideLng,
          );

          console.log("Distance calculated:", distance, "km");
          console.log("Within 50km?", distance <= Number(radius));

          if (distance <= Number(radius)) {
            ride.distance = distance.toFixed(2) + " km";
            nearbyRides.push(ride);
          }
        } else {
          console.log("Still NaN after Number() conversion");
        }
      } else {
        console.log("Invalid pickupLocation structure");
      }
    }

    console.log("\n=== DEBUG END ===");
    console.log("Nearby rides found:", nearbyRides.length);

    res.status(200).json({
      success: true,
      count: nearbyRides.length,
      radius: radius + "km",
      location: {
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
      rides: nearbyRides,
      debug: {
        totalRides: allRides.length,
        yourLocation: { latitude, longitude },
      },
    });
  } catch (error) {
    console.error("Get nearby rides error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
