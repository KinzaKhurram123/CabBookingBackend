const mongoose = require("mongoose");
const dotenv = require("dotenv");
const RideBooking = require("./models/rideBooking");
const ParcelBooking = require("./models/parcelBooking");
const PetDeliveryBooking = require("./models/petDeliveryBooking");
const User = require("./models/user");

dotenv.config();

// Replace this with your current user ID from /api/users/profile
// Example: "69e21c8b6bb93efa827a45d5"
const YOUR_USER_ID = "PASTE_YOUR_USER_ID_HERE";

const checkUserBookings = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get user details
    const user = await User.findById(YOUR_USER_ID).select("name email phone");
    if (!user) {
      console.log("❌ User not found with ID:", YOUR_USER_ID);
      console.log("\n💡 Steps to fix:");
      console.log("1. Call GET /api/users/profile to get your user ID");
      console.log("2. Replace YOUR_USER_ID in this script with your actual user ID");
      console.log("3. Run: node check-user-bookings.js");
      process.exit(1);
    }

    console.log("👤 User Details:");
    console.log("   Name:", user.name);
    console.log("   Email:", user.email);
    console.log("   ID:", YOUR_USER_ID);

    const activeStatuses = ["pending", "accepted", "onTheWay", "arrived", "inProgress"];

    // Check rides
    const rides = await RideBooking.find({
      user: YOUR_USER_ID,
      status: { $in: activeStatuses },
    }).lean();

    console.log("\n🚗 Active Rides:", rides.length);
    if (rides.length > 0) {
      rides.forEach((ride, i) => {
        console.log(`   ${i + 1}. ID: ${ride._id}, Status: ${ride.status}`);
      });
    }

    // Check parcels
    const parcels = await ParcelBooking.find({
      user: YOUR_USER_ID,
      status: { $in: activeStatuses },
    }).lean();

    console.log("\n📦 Active Parcel Deliveries:", parcels.length);
    if (parcels.length > 0) {
      parcels.forEach((parcel, i) => {
        console.log(`   ${i + 1}. ID: ${parcel._id}, Status: ${parcel.status}, Receiver: ${parcel.receiverName}`);
      });
    }

    // Check pet deliveries
    const pets = await PetDeliveryBooking.find({
      user: YOUR_USER_ID,
      status: { $in: activeStatuses },
    }).lean();

    console.log("\n🐾 Active Pet Deliveries:", pets.length);
    if (pets.length > 0) {
      pets.forEach((pet, i) => {
        console.log(`   ${i + 1}. ID: ${pet._id}, Status: ${pet.status}, Pet: ${pet.pet_name}`);
      });
    }

    const total = rides.length + parcels.length + pets.length;
    console.log("\n📊 Total Active Bookings:", total);

    if (total === 0) {
      console.log("\n❌ No active bookings found for this user");
      console.log("\n💡 To test the API:");
      console.log("1. Create a new booking (ride/parcel/pet)");
      console.log("2. Then call GET /api/users/current-active-booking");
      console.log("\nOR");
      console.log("Login with user ID: 69e606987683ac9829b7e940 (has 1 pending parcel)");
    } else {
      console.log("\n✅ API should return these bookings when you call:");
      console.log("   GET /api/users/current-active-booking");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

checkUserBookings();
