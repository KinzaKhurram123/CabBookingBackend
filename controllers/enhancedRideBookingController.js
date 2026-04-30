const RideBooking = require("../models/rideBooking");
const {
  validateScheduledDateTime,
  validateWaypoints,
  calculateWaypointFees,
} = require("../services/scheduledRideService");

// Create ride booking with scheduling and waypoints support
exports.createEnhancedRideBooking = async (req, res) => {
  try {
    const {
      category,
      selectedVehicle,
      pickupLocation,
      dropoffLocation,
      pickupLocationName,
      dropoffLocationName,
      paymentType,
      fare,
      distance,
      time,
      scheduledDateTime, // Optional
      waypoints, // Optional array
    } = req.body;

    // Validate required fields
    if (!category || !selectedVehicle || !pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: category, selectedVehicle, pickupLocation, dropoffLocation",
      });
    }

    if (!pickupLocationName || !dropoffLocationName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: pickupLocationName, dropoffLocationName",
      });
    }

    // Validate pickup and dropoff coordinates
    if (!pickupLocation.lat || !pickupLocation.lng) {
      return res.status(400).json({
        success: false,
        message: "Invalid pickup location coordinates",
      });
    }

    if (!dropoffLocation.lat || !dropoffLocation.lng) {
      return res.status(400).json({
        success: false,
        message: "Invalid dropoff location coordinates",
      });
    }

    // Validate scheduled date/time if provided
    if (scheduledDateTime) {
      const validation = validateScheduledDateTime(scheduledDateTime);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }
    }

    // Validate waypoints if provided
    if (waypoints && waypoints.length > 0) {
      const validation = validateWaypoints(waypoints);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }
    }

    // Calculate waypoint fees
    const waypointFees = calculateWaypointFees(waypoints);

    // Add sequence numbers to waypoints
    const processedWaypoints = waypoints
      ? waypoints.map((wp, index) => ({
          ...wp,
          sequence: index + 1,
        }))
      : [];

    // Calculate total fare with waypoint fees
    const baseFare = parseFloat(fare) || 0;
    if (baseFare <= 0) {
      return res.status(400).json({
        success: false,
        message: "Fare must be greater than 0",
      });
    }

    const totalFare = baseFare + waypointFees;

    // Determine status
    const status = scheduledDateTime ? "scheduled" : "pending";
    const isScheduled = !!scheduledDateTime;

    // Create ride booking
    const rideBooking = await RideBooking.create({
      user: req.user._id,
      category,
      selectedVehicle,
      pickupLocation: {
        type: "Point",
        coordinates: [pickupLocation.lng, pickupLocation.lat],
      },
      dropoffLocation: {
        lat: dropoffLocation.lat,
        lng: dropoffLocation.lng,
      },
      pickupLocationName,
      dropoffLocationName,
      paymentType: paymentType || "Cash",
      fare: totalFare.toString(),
      distance,
      time,
      date: new Date().toISOString(),
      status,
      scheduledDateTime: scheduledDateTime || null,
      isScheduled,
      scheduledAt: scheduledDateTime ? new Date() : null,
      waypoints: processedWaypoints,
      fareBreakdown: {
        baseFare: baseFare,
        distanceFare: 0, // Can be calculated based on distance
        timeFare: 0, // Can be calculated based on time
        waypointFees: waypointFees,
        totalFare: totalFare,
      },
      statusHistory: [
        {
          status: status,
          changedBy: req.user._id,
          userRole: "user",
          reason: "Ride booking created",
          changedAt: new Date(),
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: isScheduled
        ? "Scheduled ride booking created successfully"
        : "Ride booking created successfully",
      booking: {
        id: rideBooking._id,
        status: rideBooking.status,
        isScheduled: rideBooking.isScheduled,
        scheduledDateTime: rideBooking.scheduledDateTime,
        waypoints: rideBooking.waypoints,
        fare: {
          baseFare: baseFare,
          waypointFees: waypointFees,
          totalFare: totalFare,
        },
        pickupLocation: pickupLocationName,
        dropoffLocation: dropoffLocationName,
        createdAt: rideBooking.createdAt,
      },
    });
  } catch (error) {
    console.error("Create enhanced ride booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating ride booking",
      error: error.message,
    });
  }
};

// Update waypoints (only before driver acceptance)
exports.updateWaypoints = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { waypoints } = req.body;

    // Validate bookingId format
    if (!bookingId || bookingId.length !== 24) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format",
      });
    }

    if (!waypoints || !Array.isArray(waypoints)) {
      return res.status(400).json({
        success: false,
        message: "Waypoints must be an array",
      });
    }

    const booking = await RideBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized - You can only modify your own bookings",
      });
    }

    // Check if ride is still pending or scheduled (not accepted)
    if (!["pending", "scheduled"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify waypoints after driver acceptance",
        currentStatus: booking.status,
      });
    }

    // Validate waypoints
    const validation = validateWaypoints(waypoints);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // Add sequence numbers
    const processedWaypoints = waypoints.map((wp, index) => ({
      ...wp,
      sequence: index + 1,
    }));

    // Recalculate fare
    const waypointFees = calculateWaypointFees(waypoints);
    const baseFare = booking.fareBreakdown?.baseFare || parseFloat(booking.fare) || 0;
    const totalFare = baseFare + waypointFees;

    // Update booking
    booking.waypoints = processedWaypoints;
    booking.fareBreakdown = {
      baseFare: baseFare,
      distanceFare: booking.fareBreakdown?.distanceFare || 0,
      timeFare: booking.fareBreakdown?.timeFare || 0,
      waypointFees: waypointFees,
      totalFare: totalFare,
    };
    booking.fare = totalFare.toString();

    // Add to status history
    if (!booking.statusHistory) {
      booking.statusHistory = [];
    }
    booking.statusHistory.push({
      status: booking.status,
      changedBy: req.user._id,
      userRole: "user",
      reason: `Waypoints updated (${waypoints.length} stops)`,
      changedAt: new Date(),
    });

    await booking.save();

    res.json({
      success: true,
      message: "Waypoints updated successfully",
      booking: {
        id: booking._id,
        status: booking.status,
        waypoints: booking.waypoints,
        fare: {
          baseFare: baseFare,
          waypointFees: waypointFees,
          totalFare: totalFare,
        },
      },
    });
  } catch (error) {
    console.error("Update waypoints error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating waypoints",
      error: error.message,
    });
  }
};

// Track waypoint arrival/departure
exports.trackWaypointEvent = async (req, res) => {
  try {
    const { bookingId, waypointIndex } = req.params;
    const { event } = req.body; // "arrived" or "departed"

    // Validate bookingId format
    if (!bookingId || bookingId.length !== 24) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format",
      });
    }

    if (!["arrived", "departed"].includes(event)) {
      return res.status(400).json({
        success: false,
        message: 'Event must be "arrived" or "departed"',
      });
    }

    const booking = await RideBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if user owns this booking or is the driver
    const isOwner = booking.user.toString() === req.user._id.toString();
    const isDriver = booking.driver && booking.driver.toString() === req.user._id.toString();

    if (!isOwner && !isDriver) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized - Only the user or driver can track waypoints",
      });
    }

    const index = parseInt(waypointIndex);
    if (index < 0 || index >= booking.waypoints.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid waypoint index",
      });
    }

    // Check if ride is in progress
    if (!["inProgress", "onTheWay"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Can only track waypoints for rides in progress",
        currentStatus: booking.status,
      });
    }

    // Update waypoint timestamp
    if (event === "arrived") {
      booking.waypoints[index].arrivalTime = new Date();
    } else {
      booking.waypoints[index].departureTime = new Date();
    }

    await booking.save();

    res.json({
      success: true,
      message: `Waypoint ${event} event recorded successfully`,
      waypoint: {
        sequence: booking.waypoints[index].sequence,
        address: booking.waypoints[index].address,
        arrivalTime: booking.waypoints[index].arrivalTime,
        departureTime: booking.waypoints[index].departureTime,
      },
    });
  } catch (error) {
    console.error("Track waypoint event error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while tracking waypoint",
      error: error.message,
    });
  }
};

// Cancel scheduled ride
exports.cancelScheduledRide = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate bookingId format
    if (!bookingId || bookingId.length !== 24) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format",
      });
    }

    const booking = await RideBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized - You can only cancel your own bookings",
      });
    }

    // Check if ride is already cancelled
    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This ride has already been cancelled",
      });
    }

    // Check if it's a scheduled ride
    if (!booking.isScheduled) {
      return res.status(400).json({
        success: false,
        message: "This is not a scheduled ride. Only scheduled rides can be cancelled.",
      });
    }

    // Check if ride has already been accepted by a driver
    if (booking.driver) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a ride that has been accepted by a driver",
      });
    }

    // Check if cancellation is within 5 minutes of scheduled time
    const now = new Date();
    const scheduledTime = new Date(booking.scheduledDateTime);
    const fiveMinutesBeforeScheduled = new Date(scheduledTime.getTime() - 5 * 60000);

    if (now >= fiveMinutesBeforeScheduled) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel within 5 minutes of scheduled time",
        scheduledTime: booking.scheduledDateTime,
        currentTime: now,
        cancellationDeadline: fiveMinutesBeforeScheduled,
      });
    }

    // Add cancellation to status history
    if (!booking.statusHistory) {
      booking.statusHistory = [];
    }
    booking.statusHistory.push({
      status: "cancelled",
      changedBy: req.user._id,
      userRole: "user",
      reason: "User initiated cancellation",
      changedAt: new Date(),
    });

    // Cancel the ride
    booking.status = "cancelled";
    booking.completedAt = new Date(); // Mark completion time for cancelled rides
    await booking.save();

    // TODO: Refund any prepaid amount to user's wallet

    res.json({
      success: true,
      message: "Scheduled ride cancelled successfully",
      booking: {
        id: booking._id,
        status: booking.status,
        isScheduled: booking.isScheduled,
        scheduledDateTime: booking.scheduledDateTime,
        pickupLocation: booking.pickupLocationName,
        dropoffLocation: booking.dropoffLocationName,
        fare: booking.fare,
        distance: booking.distance,
        time: booking.time,
        cancelledAt: booking.completedAt,
        waypoints: booking.waypoints,
      },
    });
  } catch (error) {
    console.error("Cancel scheduled ride error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while cancelling ride",
      error: error.message,
    });
  }
};

module.exports = {
  createEnhancedRideBooking: exports.createEnhancedRideBooking,
  updateWaypoints: exports.updateWaypoints,
  trackWaypointEvent: exports.trackWaypointEvent,
  cancelScheduledRide: exports.cancelScheduledRide,
};
