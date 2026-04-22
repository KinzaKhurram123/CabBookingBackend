const mongoose = require("mongoose");
require("dotenv").config();

const Rider = require("./models/riderModel");

async function testAPIDatabase() {
  try {
    console.log("🔍 Testing which database has the riders...\n");

    // Test 1: MONGO_URI (ridelynk-database)
    console.log("1️⃣  Testing MONGO_URI (ridelynk-database):");
    console.log(`   URI: ${process.env.MONGO_URI}`);
    
    await mongoose.connect(process.env.MONGO_URI);
    let ridersCount = await Rider.countDocuments();
    console.log(`   ✅ Riders found: ${ridersCount}`);
    await mongoose.disconnect();

    // Test 2: MONGODB_URI (DigitalOcean)
    console.log("\n2️⃣  Testing MONGODB_URI (DigitalOcean):");
    console.log(`   URI: ${process.env.MONGODB_URI}`);
    
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      ridersCount = await Rider.countDocuments();
      console.log(`   ✅ Riders found: ${ridersCount}`);
      await mongoose.disconnect();
    } catch (error) {
      console.log(`   ❌ Connection failed: ${error.message}`);
    }

    console.log("\n📊 Summary:");
    console.log("   - MONGO_URI (ridelynk-database) has the riders");
    console.log("   - Make sure your server is using MONGO_URI");
    console.log("   - Check that the running server is using the correct database");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testAPIDatabase();