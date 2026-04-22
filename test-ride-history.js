const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/user");
const RideBooking = require("./models/rideBooking");

async function testRideHistory() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get a test user
    const user = await User.findOne();
    
    if (!user) {
      console.log("❌ No users found in database");
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user._id})\n`);

    // Check if user has any ride bookings
    const rideCount = await RideBooking.countDocuments({ user: user._id });
    console.log(`📊 User has ${rideCount} ride bookings\n`);

    if (rideCount > 0) {
      const rides = await RideBooking.find({ user: user._id })
        .limit(5)
        .lean();
      
      console.log("📋 Sample rides:");
      rides.forEach((ride, index) => {
        console.log(`   ${index + 1}. Status: ${ride.status}, Fare: ${ride.fare}`);
      });
    } else {
      console.log("⚠️  User has no ride bookings");
    }

    // Test the endpoint URL
    console.log(`\n🔗 Endpoint URL:`);
    console.log(`   GET /api/rides/ride_history/${user._id}`);
    console.log(`   GET /api/ride/ride_history/${user._id}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

testRideHistory();