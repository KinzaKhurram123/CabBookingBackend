const mongoose = require("mongoose");
const dotenv = require("dotenv");
const RideBooking = require("./models/rideBooking");
const ParcelBooking = require("./models/parcelBooking");
const PetDeliveryBooking = require("./models/petDeliveryBooking");

dotenv.config();

const testCurrentActiveBookingAPI = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const userId = "69e606987683ac9829b7e940";
    console.log("🔍 Testing API for user:", userId);

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

    console.log("\n🚗 Active Rides:", rideBookings.length);
    rideBookings.forEach((booking) => {
      allActiveBookings.push({
        bookingType: "ride",
        ...booking,
        driverLocation: booking.driver?.location?.coordinates
          ? {
              latitude: booking.driver.location.coordinates[1],
              longitude: booking.driver.location.coordinates[0],
            }
          : null,
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

    console.log("📦 Active Parcel Deliveries:", parcelBookings.length);
    parcelBookings.forEach((booking) => {
      console.log(`   - ID: ${booking._id}`);
      console.log(`     Status: ${booking.status}`);
      console.log(`     Receiver: ${booking.receiverName}`);
      console.log(`     Fare: $${booking.totalFare}`);

      allActiveBookings.push({
        bookingType: "parcel",
        ...booking,
        driverLocation: booking.driver?.location?.coordinates
          ? {
              latitude: booking.driver.location.coordinates[1],
              longitude: booking.driver.location.coordinates[0],
            }
          : null,
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

    console.log("🐾 Active Pet Deliveries:", petDeliveryBookings.length);
    petDeliveryBookings.forEach((booking) => {
      allActiveBookings.push({
        bookingType: "petDelivery",
        ...booking,
        driverLocation: booking.driver?.location?.coordinates
          ? {
              latitude: booking.driver.location.coordinates[1],
              longitude: booking.driver.location.coordinates[0],
            }
          : null,
      });
    });

    // Sort all bookings by creation date
    allActiveBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log("\n📊 Total Active Bookings:", allActiveBookings.length);

    console.log("\n✅ API Response Preview:");
    console.log(JSON.stringify({
      success: true,
      hasActiveBooking: allActiveBookings.length > 0,
      count: allActiveBookings.length,
      bookings: allActiveBookings.map(b => ({
        bookingType: b.bookingType,
        _id: b._id,
        status: b.status,
        ...(b.bookingType === 'parcel' && {
          receiverName: b.receiverName,
          totalFare: b.totalFare,
          pickupLocationName: b.pickupLocationName,
          dropoffLocationName: b.dropoffLocationName,
        }),
        createdAt: b.createdAt,
      })),
    }, null, 2));

    console.log("\n🎯 Now test in Postman/Thunder Client:");
    console.log("   GET http://localhost:5000/api/users/current-active-booking");
    console.log("   Authorization: Bearer YOUR_TOKEN");
    console.log("\n✅ You should see the same data!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

testCurrentActiveBookingAPI();
