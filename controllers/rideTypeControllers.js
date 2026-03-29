const RideType = require("../models/rideType");

exports.getRideTypes = async (req, res) => {
  try {
    const rideTypes = await RideType.find({ isActive: true }).sort({
      order: 1,
    });

    const groupedRideTypes = {
      standard: {
        category: "Standard",
        description: "Everyday rides at affordable prices",
        rides: [],
      },
      economy: {
        category: "Economy",
        description: "Value-for-money rides with special features",
        rides: [],
      },
      premium: {
        category: "Premium",
        description: "Luxury rides for special occasions",
        rides: [],
      },
      special: {
        category: "Special",
        description: "Specialized rides for specific needs",
        rides: [],
      },
    };

    rideTypes.forEach((ride) => {
      if (groupedRideTypes[ride.category]) {
        groupedRideTypes[ride.category].rides.push({
          id: ride.rideId,
          name: ride.name,
          features: ride.features,
          price: ride.priceModel,
          capacity: ride.capacity,
          time: {
            type: "real_time",
            unit: "minutes",
            description: ride.timeEstimate,
          },
          icon: ride.icon,
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Ride types fetched successfully",
      data: groupedRideTypes,
    });
  } catch (error) {
    console.error("Error fetching ride types:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
