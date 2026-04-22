const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/user");
const RideBooking = require("./models/rideBooking");

async function testSpecificUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // The user ID from the error
    const userId = "69e236866bb93efa827a466a";
    
    console.log(`🔍 Looking for user: ${userId}\n`);

    const user = await User.findById(userId);
    
    if (!user) {
      console.log("❌ User not found");
      
      // List all users
      console.log("\n📋 All users in database:");
      const allUsers = await User.find().select("_id name email").limit(10);
      allUsers.forEach((u, index) => {
        console.log(`   ${index + 1}. ${u.name} (${u._id})`);
      });
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user._id})\n`);

    // Check if user has any ride bookings
    const rideCount = await RideBooking.countDocuments({ user: userId });
    console.log(`📊 User has ${rideCount} ride bookings\n`);

    if (rideCount > 0) {
      const rides = await RideBooking.find({ user: userId })
        .limit(5)
        .lean();
      
      console.log("📋 Sample rides:");
      rides.forEach((ride, index) => {
        console.log(`   ${index + 1}. Status: ${ride.status}, Fare: ${ride.fare}`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

testSpecificUser();