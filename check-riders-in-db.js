const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const Rider = require("./models/riderModel");
const User = require("./models/user");

async function checkRidersInDB() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    console.log(`📍 URI: ${process.env.MONGO_URI}`);
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check riders collection
    console.log("\n📊 Checking Riders Collection:");
    const ridersCount = await Rider.countDocuments();
    console.log(`   Total riders: ${ridersCount}`);

    if (ridersCount > 0) {
      console.log("\n📋 All riders in database:");
      const allRiders = await Rider.find().lean();
      
      allRiders.forEach((rider, index) => {
        console.log(`\n   ${index + 1}. Rider ID: ${rider._id}`);
        console.log(`      User ID: ${rider.user}`);
        console.log(`      Status: ${rider.status}`);
        console.log(`      Verified: ${rider.isVerified}`);
        console.log(`      Vehicle: ${rider.vehicleDetails?.make || 'N/A'} ${rider.vehicleDetails?.model || 'N/A'}`);
      });

      // Now try to populate user data
      console.log("\n\n🔗 Trying to populate user data:");
      const ridersWithUsers = await Rider.find()
        .populate("user", "name email phoneNumber profileImage city country createdAt")
        .lean();
      
      ridersWithUsers.forEach((rider, index) => {
        console.log(`\n   ${index + 1}. Rider: ${rider._id}`);
        console.log(`      User Name: ${rider.user?.name || 'NOT FOUND'}`);
        console.log(`      User Email: ${rider.user?.email || 'NOT FOUND'}`);
        console.log(`      User ID: ${rider.user?._id || 'NOT FOUND'}`);
      });

      // Check if users exist
      console.log("\n\n👥 Checking Users Collection:");
      const usersCount = await User.countDocuments();
      console.log(`   Total users: ${usersCount}`);

      // Check if the user IDs from riders exist in users collection
      console.log("\n\n🔍 Checking if rider user IDs exist in users collection:");
      for (let rider of allRiders) {
        const user = await User.findById(rider.user);
        if (user) {
          console.log(`   ✅ User found for rider ${rider._id}: ${user.name} (${user.email})`);
        } else {
          console.log(`   ❌ User NOT found for rider ${rider._id} (User ID: ${rider.user})`);
        }
      }

      // Test the getAllDrivers query
      console.log("\n\n🧪 Testing getAllDrivers query:");
      const query = {};
      const riders = await Rider.find(query)
        .populate("user", "name email phoneNumber profileImage city country createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      console.log(`   Query returned: ${riders.length} riders`);
      riders.forEach((r, i) => {
        console.log(`   ${i + 1}. Name: ${r.user?.name || 'N/A'}, Status: ${r.status}`);
      });

    } else {
      console.log("   ❌ No riders found in database!");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

checkRidersInDB();