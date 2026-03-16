const PetDeliveryBooking = require("../models/petDeliveryBooking");

exports.createPetDeliveryBooking = async (req, res) => {
  try {
    const {
      pet_name,
      pet_type,
      owner_name,
      owner_phone,
      pickupLocation,
      dropOffLocation,
      dropoffLocationName,
      pickupLocationName,
    } = req.body;

    const requiredFields = [
      "pet_name",
      "pet_type",
      "owner_name",
      "owner_phone",
      "pickupLocation",
      "dropoffLocation",
      "pickupLocationName",
      "dropoffLocationName",
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res
          .status(400)
          .json({ message: `Missing required field: ${field}` });
      }
    }

    const newBooking = new PetDeliveryBooking({
      ...req.body,
      user: req.body.userId,
    });

    const savedBooking = await newBooking.save();

    res.status(201).json({
      message: "Pet delivery booking created successfully",
      data: savedBooking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
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
    const booking = await PetDeliveryBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({
      message: "Pet delivery booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
