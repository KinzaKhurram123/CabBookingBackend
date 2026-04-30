const RideBooking = require("../models/rideBooking");

// Validate scheduled date/time
const validateScheduledDateTime = (scheduledDateTime) => {
  const now = new Date();
  const scheduled = new Date(scheduledDateTime);

  // Check if date is in the future
  if (scheduled <= now) {
    return {
      valid: false,
      error: "Scheduled time must be in the future",
    };
  }

  // Check if date is within 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (scheduled > thirtyDaysFromNow) {
    return {
      valid: false,
      error: "Cannot schedule rides more than 30 days in advance",
    };
  }

  return { valid: true };
};

// Validate waypoints
const validateWaypoints = (waypoints) => {
  if (!waypoints || waypoints.length === 0) {
    return { valid: true }; // Waypoints are optional
  }

  if (waypoints.length > 5) {
    return {
      valid: false,
      error: "Maximum 5 stops allowed per ride",
    };
  }

  // Validate each waypoint
  for (let i = 0; i < waypoints.length; i++) {
    const waypoint = waypoints[i];

    if (!waypoint.latitude || !waypoint.longitude || !waypoint.address) {
      return {
        valid: false,
        error: `Waypoint ${i + 1} must have latitude, longitude, and address`,
      };
    }

    // Validate coordinates
    if (
      waypoint.latitude < -90 ||
      waypoint.latitude > 90 ||
      waypoint.longitude < -180 ||
      waypoint.longitude > 180
    ) {
      return {
        valid: false,
        error: `Waypoint ${i + 1} has invalid coordinates`,
      };
    }
  }

  return { valid: true };
};

// Calculate waypoint fees ($2 per waypoint)
const calculateWaypointFees = (waypoints) => {
  if (!waypoints || waypoints.length === 0) {
    return 0;
  }
  return waypoints.length * 2; // $2 per waypoint
};

// Process scheduled rides (to be called by cron job)
const processScheduledRides = async () => {
  try {
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60000);

    // Find rides scheduled for 15 minutes from now
    const scheduledRides = await RideBooking.find({
      status: "scheduled",
      scheduledDateTime: {
        $gte: now,
        $lte: fifteenMinutesFromNow,
      },
      matchingStartedAt: null, // Not yet started matching
    });

    console.log(`Found ${scheduledRides.length} scheduled rides to process`);

    for (const ride of scheduledRides) {
      try {
        // Update matching started timestamp
        ride.matchingStartedAt = new Date();
        await ride.save();

        // TODO: Trigger driver matching logic here
        // This would typically involve:
        // 1. Finding nearby available drivers
        // 2. Sending notifications to drivers
        // 3. Waiting for driver acceptance

        console.log(`Started matching for scheduled ride ${ride._id}`);
      } catch (error) {
        console.error(`Error processing scheduled ride ${ride._id}:`, error);
      }
    }

    // Check for rides that didn't get a driver within 10 minutes of scheduled time
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60000);
    const unmatchedRides = await RideBooking.find({
      status: "scheduled",
      scheduledDateTime: {
        $lte: tenMinutesAgo,
      },
      driver: null,
    });

    for (const ride of unmatchedRides) {
      try {
        ride.status = "no_driver_available";
        await ride.save();

        // TODO: Send notification to user
        console.log(`No driver found for scheduled ride ${ride._id}`);
      } catch (error) {
        console.error(`Error updating unmatched ride ${ride._id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in processScheduledRides:", error);
  }
};

module.exports = {
  validateScheduledDateTime,
  validateWaypoints,
  calculateWaypointFees,
  processScheduledRides,
};
