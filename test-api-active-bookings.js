const mongoose = require("mongoose");
const dotenv = require("dotenv");
const RideBooking = require("./models/rideBooking");
const ParcelBooking = require("./models/parcelBooking");
const PetDeliveryBooking = require("./models/petDeliveryBooking");

dotenv.config();

const testAPILogic = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Test with the user who has the parcel booking
    const userId = "69e606987683ac9829b7e940";
    console.log("\n🔍 Testing API logic for user:", userId);

    const activeStatuses = ["pending", "accepted", "onTheWay", "arrived", "inProgress"];
    const allActiveBookings = [];

    // Get all active ride bookings
    const rideBookings = await RideBooking.find({
      user: userId,
      status: { $in: activeStatuses },
    })
      .populate("driver", "name phone profileImage vehicleDetails location")
      .sort({ createdAt: -1 })
      .lean();

    console.log("\n🚗 Ride Bookings Found:", rideBookings.length);
    rideBookings.forEach((booking) => {
      allActiveBookings.push({
        bookingType: "ride",
        ...booking,
      });
    });

    // Get all active parcel deliveries
    const parcelBookings = await ParcelBooking.find({
      user: userId,
      status: { $in: activeStatuses },
    })
      .populate("driver", "name phone profileImage vehicleDetails location")
      .sort({ createdAt: -1 })
      .lean();

    console.log("📦 Parcel Bookings Found:", parcelBookings.length);
    parcelBookings.forEach((booking) => {
      console.log("\nParcel Details:");
      console.log("  ID:", booking._id);
      console.log("  Status:", booking.status);
      console.log("  Receiver:", booking.receiverName);
      console.log("  User:", booking.user);

      allActiveBookings.push({
        bookingType: "parcel",
        ...booking,
      });
    });

    // Get all active pet deliveries
    const petDeliveryBookings = await PetDeliveryBooking.find({
      user: userId,
      status: { $in: activeStatuses },
    })
      .populate("driver", "name phone profileImage vehicleDetails location")
      .sort({ createdAt: -1 })
      .lean();

    console.log("🐾 Pet Delivery Bookings Found:", petDeliveryBookings.length);
    petDeliveryBookings.forEach((booking) => {
      allActiveBookings.push({
        bookingType: "petDelivery",
        ...booking,
      });
    });

    // Sort all bookings by creation date
    allActiveBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log("\n📊 Total Active Bookings:", allActiveBookings.length);
    console.log("\n✅ API Response would be:");
    console.log(JSON.stringify({
      success: true,
      hasActiveBooking: allActiveBookings.length > 0,
      count: allActiveBookings.length,
      bookings: allActiveBookings.map(b => ({
        bookingType: b.bookingType,
        _id: b._id,
        status: b.status,
        createdAt: b.createdAt
      })),
    }, null, 2));

    console.log("\n✅ Test completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

testAPILogic();
