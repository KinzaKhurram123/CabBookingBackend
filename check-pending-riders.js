const mongoose = require("mongoose");
require("dotenv").config();

const Rider = require("./models/riderModel");
const Driver = require("./models/driverModel");

async function checkPendingRiders() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check Driver model
    console.log("1️⃣  Checking Driver model:");
    const driversCount = await Driver.countDocuments();
    console.log(`   Total drivers: ${driversCount}`);
    
    const pendingDrivers = await Driver.find({
      verificationStatus: "pending",
      isVerified: false,
    });
    console.log(`   Pending drivers: ${pendingDrivers.length}`);

    // Check Rider model
    console.log("\n2️⃣  Checking Rider model:");
    const ridersCount = await Rider.countDocuments();
    console.log(`   Total riders: ${ridersCount}`);
    
    const pendingRiders = await Rider.find({
      verificationStatus: "pending",
      isVerified: false,
    });
    console.log(`   Pending riders: ${pendingRiders.length}`);

    // Check all verification statuses in Rider model
    console.log("\n3️⃣  All verification statuses in Rider model:");
    const allRiders = await Rider.find().lean();
    const statuses = {};
    
    allRiders.forEach(rider => {
      const status = rider.verificationStatus || "none";
      statuses[status] = (statuses[status] || 0) + 1;
    });
    
    Object.entries(statuses).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Show all riders with their verification status
    console.log("\n4️⃣  All riders with verification status:");
    const ridersWithUsers = await Rider.find()
      .populate("user", "name email")
      .lean();
    
    ridersWithUsers.forEach((rider, index) => {
      console.log(`   ${index + 1}. ${rider.user?.name || 'N/A'} - Status: ${rider.verificationStatus}, Verified: ${rider.isVerified}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

checkPendingRiders();