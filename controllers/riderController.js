const Rider = require("../models/riderModel");
const User = require("../models/user");

exports.updateRiderProfile = async (req, res) => {
  try {
    const {
      phoneNumber,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      make,
      model,
      year,
      color,
      licensePlate,
      address,
      city,
      emergencyContact,
    } = req.body;

    const riderData = {
      user: req.user._id,
      phoneNumber,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      make,
      model,
      year,
      color,
      licensePlate,
      address,
      city,
      emergencyContact,
      updatedAt: new Date(),
    };

    const updatedRider = await Rider.findOneAndUpdate(
      { user: req.user._id },
      { $set: riderData },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    ).populate({
      path: "user",
      select: "-password -__v -resetPasswordToken -resetPasswordExpire",
    });

    if (req.body.name || req.body.email) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          name: req.body.name,
          email: req.body.email,
          phone: phoneNumber,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Rider profile updated successfully",
      rider: updatedRider,
    });
  } catch (error) {
    console.error("Update rider profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating rider profile",
      error: error.message,
    });
  }
};

exports.updateRiderLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    const rider = await Rider.findOneAndUpdate(
      { user: req.user._id },
      {
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
      { new: true, upsert: true },
    );

    res.status(200).json({
      success: true,
      message: "Rider location updated successfully",
      rider,
    });
  } catch (error) {
    console.error("Update rider location error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
