const RideType = require("../models/rideType");

exports.getRideTypes = async (req, res) => {
  try {
    const rideTypes = await RideType.find({ isActive: true }).sort({
      order: 1,
    });

    // Group by category
    const groupedRideTypes = {};

    rideTypes.forEach((ride) => {
      const category = ride.category;

      if (!groupedRideTypes[category]) {
        groupedRideTypes[category] = {
          category: ride.categoryDisplayName || category,
          description: ride.categoryDescription || "",
          icon: ride.categoryIcon || "car",
          color: ride.categoryColor || "#2196F3",
          rides: [],
        };
      }

      groupedRideTypes[category].rides.push({
        id: ride.rideId,
        name: ride.name,
        description: ride.description,
        features: ride.features,
        price: ride.price,
        capacity: ride.capacity,
        timeEstimate: ride.timeEstimate,
        luggageCapacity: ride.luggageCapacity,
        icon: ride.icon,
        isActive: ride.isActive,
      });
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

// ─── ADMIN: Get All Ride Types (List) ────────────────────────────────────────

exports.getAllRideTypesAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, isActive } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const total = await RideType.countDocuments(filter);
    const rideTypes = await RideType.find(filter)
      .sort({ category: 1, order: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: rideTypes,
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

// ─── ADMIN: Get Single Ride Type ─────────────────────────────────────────────

exports.getRideTypeById = async (req, res) => {
  try {
    const rideType = await RideType.findById(req.params.id);

    if (!rideType) {
      return res.status(404).json({
        success: false,
        message: "Ride type not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rideType,
    });
  } catch (error) {
    console.error("Error fetching ride type:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ─── ADMIN: Create Ride Type ─────────────────────────────────────────────────

exports.createRideType = async (req, res) => {
  try {
    const {
      category,
      categoryDisplayName,
      categoryDescription,
      categoryIcon,
      categoryColor,
      rideId,
      name,
      description,
      features,
      price,
      capacity,
      luggageCapacity,
      timeEstimate,
      icon,
      isActive,
      order,
    } = req.body;

    // Validate required fields
    if (
      !category ||
      !categoryDisplayName ||
      !rideId ||
      !name ||
      !price ||
      !capacity
    ) {
      return res.status(400).json({
        success: false,
        message:
          "category, categoryDisplayName, rideId, name, price, and capacity are required",
      });
    }

    // Check if rideId already exists
    const existing = await RideType.findOne({ rideId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Ride type with this ID already exists",
      });
    }

    const rideType = await RideType.create({
      category,
      categoryDisplayName,
      categoryDescription,
      categoryIcon,
      categoryColor,
      rideId,
      name,
      description,
      features: Array.isArray(features) ? features : [],
      price,
      capacity,
      luggageCapacity: luggageCapacity || 2,
      timeEstimate: timeEstimate || "Real time in Minutes, wait time",
      icon: icon || "car",
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
    });

    res.status(201).json({
      success: true,
      message: "Ride type created successfully",
      data: rideType,
    });
  } catch (error) {
    console.error("Error creating ride type:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ─── ADMIN: Update Ride Type ─────────────────────────────────────────────────

exports.updateRideType = async (req, res) => {
  try {
    const rideType = await RideType.findById(req.params.id);

    if (!rideType) {
      return res.status(404).json({
        success: false,
        message: "Ride type not found",
      });
    }

    // Check if rideId is being changed and if it already exists
    if (req.body.rideId && req.body.rideId !== rideType.rideId) {
      const existing = await RideType.findOne({ rideId: req.body.rideId });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Ride type with this ID already exists",
        });
      }
    }

    const updatedRideType = await RideType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Ride type updated successfully",
      data: updatedRideType,
    });
  } catch (error) {
    console.error("Error updating ride type:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ─── ADMIN: Delete Ride Type ─────────────────────────────────────────────────

exports.deleteRideType = async (req, res) => {
  try {
    const rideType = await RideType.findByIdAndDelete(req.params.id);

    if (!rideType) {
      return res.status(404).json({
        success: false,
        message: "Ride type not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ride type deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting ride type:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ─── ADMIN: Toggle Active Status ─────────────────────────────────────────────

exports.toggleRideTypeStatus = async (req, res) => {
  try {
    const rideType = await RideType.findById(req.params.id);

    if (!rideType) {
      return res.status(404).json({
        success: false,
        message: "Ride type not found",
      });
    }

    rideType.isActive = !rideType.isActive;
    await rideType.save();

    res.status(200).json({
      success: true,
      message: `Ride type ${rideType.isActive ? "activated" : "deactivated"} successfully`,
      data: rideType,
    });
  } catch (error) {
    console.error("Error toggling ride type status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
