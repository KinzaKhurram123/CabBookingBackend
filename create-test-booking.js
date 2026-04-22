const mongoose = require("mongoose");
const dotenv = require("dotenv");
const ParcelBooking = require("./models/parcelBooking");
const User = require("./models/user");

dotenv.config();

// PASTE YOUR USER ID HERE (from GET /api/users/profile)
// Example: "69e21c8b6bb93efa827a45d5"
const YOUR_USER_ID = "69e606987683ac9829b7e940"; // Change this to your actual user ID

const createTestParcelBooking = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Verify user exists
    const user = await User.findById(YOUR_USER_ID);
    if (!user) {
      console.log("❌ User not found with ID:", YOUR_USER_ID);
      console.log("\n💡 Steps:");
      console.log("1. Call GET /api/users/profile to get your user ID");
      console.log("2. Update YOUR_USER_ID in this script");
      console.log("3. Run: node create-test-booking.js");
      process.exit(1);
    }

    console.log("👤 Creating test booking for:");
    console.log("   Name:", user.name);
    console.log("   Email:", user.email);
    console.log("   ID:", YOUR_USER_ID);

    // Create test parcel booking
    const testBooking = new ParcelBooking({
      user: YOUR_USER_ID,
      receiverName: "Test Receiver",
      receiverPhoneNumber: "+1234567890",
      cargoType: "Documents",
      selectedVehicle: "bike",
      weight: 5,
      height: 10,
      length: 20,
      numberOfPackages: 1,
      fragileItem: false,
      distance: "5",
      time: "15 minutes",
      duration: "15",
      estimateTime: "15 minutes",
      totalFare: 12.50,
      fare: "12.50",
      price: 12.50,
      pickupLocation: {
        type: "Point",
        coordinates: [67.0011, 24.8607], // Karachi coordinates
      },
      dropoffLocation: {
        lat: 24.8700,
        lng: 67.0100,
      },
      pickupLocationName: "Test Pickup Location",
      dropoffLocationName: "Test Dropoff Location",
      notes: "Test parcel booking for API testing",
      parcel_type: "document", // Valid values: document, electronics, fragile, household, large, medications, small, other
      paymentType: "Cash",
      paymentMethod: "Cash",
      status: "pending",
    });

    const savedBooking = await testBooking.save();

    console.log("\n✅ Test parcel booking created successfully!");
    console.log("   Booking ID:", savedBooking._id);
    console.log("   Status:", savedBooking.status);
    console.log("   Receiver:", savedBooking.receiverName);
    console.log("   Fare:", savedBooking.totalFare);

    console.log("\n📱 Now test your API:");
    console.log("   GET /api/users/current-active-booking");
    console.log("   Authorization: Bearer YOUR_TOKEN");
    console.log("\n✅ You should see this parcel booking in the response!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
};

createTestParcelBooking();
