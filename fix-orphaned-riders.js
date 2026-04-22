const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const Rider = require("./models/riderModel");
const User = require("./models/user");

async function fixOrphanedRiders() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all riders
    const allRiders = await Rider.find();
    console.log(`\n📊 Total riders: ${allRiders.length}`);

    // Check each rider's user reference
    console.log("\n🔍 Checking rider user references:");
    const orphanedRiders = [];
    
    for (let rider of allRiders) {
      const user = await User.findById(rider.user);
      if (!user) {
        orphanedRiders.push(rider);
        console.log(`   ❌ Orphaned rider found: ${rider._id}`);
        console.log(`      Referenced user ID: ${rider.user}`);
        console.log(`      Rider status: ${rider.status}`);
      } else {
        console.log(`   ✅ Valid rider: ${rider._id} -> ${user.name}`);
      }
    }

    if (orphanedRiders.length === 0) {
      console.log("\n✅ No orphaned riders found!");
    } else {
      console.log(`\n⚠️  Found ${orphanedRiders.length} orphaned rider(s)`);
      
      console.log("\n📋 Options to fix:");
      console.log("1. Delete orphaned riders");
      console.log("2. Link to existing user");
      
      // For now, let's delete them
      console.log("\n🗑️  Deleting orphaned riders...");
      for (let rider of orphanedRiders) {
        await Rider.findByIdAndDelete(rider._id);
        console.log(`   ✅ Deleted rider: ${rider._id}`);
      }
      
      console.log("\n✅ Cleanup complete!");
    }

    // Verify the fix
    console.log("\n🧪 Verifying fix:");
    const remainingRiders = await Rider.find()
      .populate("user", "name email")
      .lean();
    
    console.log(`   Total riders after cleanup: ${remainingRiders.length}`);
    remainingRiders.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.user?.name || 'N/A'} - Status: ${r.status}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

fixOrphanedRiders();