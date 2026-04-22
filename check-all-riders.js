const mongoose = require("mongoose");
require("dotenv").config();

const Rider = require("./models/riderModel");
const User = require("./models/user");

async function checkAllRiders() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all riders without filtering
    const allRiders = await Rider.find().lean();
    console.log(`\n📊 Total riders in database: ${allRiders.length}`);

    console.log("\n📋 All riders:");
    allRiders.forEach((rider, index) => {
      console.log(`\n${index + 1}. Rider ID: ${rider._id}`);
      console.log(`   User ID: ${rider.user}`);
      console.log(`   Status: ${rider.status}`);
      console.log(`   Verified: ${rider.isVerified}`);
      console.log(`   Vehicle: ${rider.vehicleDetails?.make || 'N/A'} ${rider.vehicleDetails?.model || 'N/A'}`);
    });

    // Try to populate with user data
    console.log("\n\n🔗 Riders with user data (if available):");
    const ridersWithUsers = await Rider.find()
      .populate("user", "name email phoneNumber profileImage city country createdAt")
      .lean();

    ridersWithUsers.forEach((rider, index) => {
      console.log(`\n${index + 1}. Rider ID: ${rider._id}`);
      console.log(`   Name: ${rider.user?.name || 'N/A'}`);
      console.log(`   Email: ${rider.user?.email || 'N/A'}`);
      console.log(`   Status: ${rider.status}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

checkAllRiders();