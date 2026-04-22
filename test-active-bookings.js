const mongoose = require("mongoose");
const dotenv = require("dotenv");
const RideBooking = require("./models/rideBooking");
const ParcelBooking = require("./models/parcelBooking");
const PetDeliveryBooking = require("./models/petDeliveryBooking");

dotenv.config();

const testActiveBookings = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const activeStatuses = ["pending", "accepted", "onTheWay", "arrived", "inProgress"];

    // Get all parcel bookings (without user filter)
    const allParcels = await ParcelBooking.find({}).lean();
    console.log("\n📦 All Parcel Bookings in DB:", allParcels.length);

    allParcels.forEach((parcel, index) => {
      console.log(`\nParcel ${index + 1}:`);
      console.log("  ID:", parcel._id);
      console.log("  User ID:", parcel.user);
      console.log("  Status:", parcel.status);
      console.log("  Receiver:", parcel.receiverName);
      console.log("  Created:", parcel.createdAt);
    });

    // Get active parcel bookings
    const activeParcels = await ParcelBooking.find({
      status: { $in: activeStatuses },
    }).lean();
    console.log("\n📦 Active Parcel Bookings:", activeParcels.length);

    // Get all ride bookings
    const allRides = await RideBooking.find({}).lean();
    console.log("\n🚗 All Ride Bookings in DB:", allRides.length);

    allRides.forEach((ride, index) => {
      console.log(`\nRide ${index + 1}:`);
      console.log("  ID:", ride._id);
      console.log("  User ID:", ride.user);
      console.log("  Status:", ride.status);
      console.log("  Created:", ride.createdAt);
    });

    // Get active ride bookings
    const activeRides = await RideBooking.find({
      status: { $in: activeStatuses },
    }).lean();
    console.log("\n🚗 Active Ride Bookings:", activeRides.length);

    // Get all pet deliveries
    const allPets = await PetDeliveryBooking.find({}).lean();
    console.log("\n🐾 All Pet Delivery Bookings in DB:", allPets.length);

    allPets.forEach((pet, index) => {
      console.log(`\nPet Delivery ${index + 1}:`);
      console.log("  ID:", pet._id);
      console.log("  User ID:", pet.user);
      console.log("  Status:", pet.status);
      console.log("  Pet Name:", pet.pet_name);
      console.log("  Created:", pet.createdAt);
    });

    // Get active pet deliveries
    const activePets = await PetDeliveryBooking.find({
      status: { $in: activeStatuses },
    }).lean();
    console.log("\n🐾 Active Pet Delivery Bookings:", activePets.length);

    console.log("\n✅ Test completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

testActiveBookings();
