const mongoose = require("mongoose");
const ParcelBooking = require("../models/parcelBooking");
const geolib = require("geolib");

const calculateParcelFare = (
  distance,
  vehicleType,
  weight,
  numberOfPackages,
) => {
  let baseFare = 0;
  switch (vehicleType) {
    case "bike":
      baseFare = 5;
      break;
    case "car":
      baseFare = 10;
      break;
    case "van":
      baseFare = 15;
      break;
    case "truck":
      baseFare = 25;
      break;
    default:
      baseFare = 10;
  }
  const distanceFare = distance * 1.5;
  const weightFare = weight * 0.5;
  const packageFare = numberOfPackages * 1;
  return baseFare + distanceFare + weightFare + packageFare;
};

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
        return res
          .status(400)
          .json({ message: `Missing required field: ${field}` });
      }
    }

    if (!pickupLocation.lat || !pickupLocation.lng) {
      return res
        .status(400)
        .json({ message: "Pickup location missing or invalid" });
    }
    if (!dropoffLocation.lat || !dropoffLocation.lng) {
      return res
        .status(400)
        .json({ message: "Dropoff location missing or invalid" });
    }

    const distance = calculateDistance(pickupLocation, dropoffLocation);

    const totalFare = calculateParcelFare(
      distance,
      selectedVehicle,
      weight,
      numberOfPackages,
    );
    const estimateTime = estimateDeliveryTime(distance, selectedVehicle);

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
      fragileItem,
      distance,
      estimateTime: `${estimateTime} minutes`,
      totalFare,
      pickupLocation,
      dropoffLocation,
      pickupLocationName,
      dropoffLocationName,
      notes,
      parcel_type,
    });

    const savedBooking = await newBooking.save();

    res.status(201).json({
      bookingId: savedBooking._id,
      receiverDetails: {
        name: savedBooking.receiverName,
        phone: savedBooking.receiverPhoneNumber,
      },
      parcelDetails: {
        cargoType: savedBooking.cargoType,
        vehicle: savedBooking.selectedVehicle,
        weight: savedBooking.weight,
        dimensions: `${savedBooking.length}x${savedBooking.height}`,
        packages: savedBooking.numberOfPackages,
        fragile: savedBooking.fragileItem,
      },
      pickupLocation: savedBooking.pickupLocation,
      dropoffLocation: savedBooking.dropoffLocation,
      pickupLocationName: savedBooking.pickupLocationName,
      dropoffLocationName: savedBooking.dropoffLocationName,
      calculatedFare: savedBooking.totalFare,
      estimatedDeliveryTime: savedBooking.estimateTime,
      bookingStatus: savedBooking.status,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
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

exports.cancelParcelBooking = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await ParcelBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
