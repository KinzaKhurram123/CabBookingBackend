const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const User = require("./models/user");
const Rider = require("./models/riderModel");

async function testRidersData() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check existing riders
    const ridersCount = await Rider.countDocuments();
    console.log(`📊 Total riders in database: ${ridersCount}`);

    if (ridersCount === 0) {
      console.log("❌ No riders found in database");
      
      // Check if there are users to create riders from
      const usersCount = await User.countDocuments();
      console.log(`👥 Total users in database: ${usersCount}`);
      
      if (usersCount > 0) {
        console.log("🔄 Creating test riders from existing users...");
        
        // Get first 3 users
        const users = await User.find().limit(3);
        
        for (let user of users) {
          // Check if rider already exists for this user
          const existingRider = await Rider.findOne({ user: user._id });
          
          if (!existingRider) {
            const newRider = new Rider({
              user: user._id,
              phoneNumber: user.phoneNumber || "1234567890",
              vehicleDetails: {
                category: "car",
                vehicleType: "sedan",
                make: "Toyota",
                model: "Corolla",
                year: "2020",
                color: "White",
                licensePlate: `ABC-${Math.floor(Math.random() * 1000)}`,
              },
              status: "available",
              isVerified: true,
              verificationStatus: "approved",
              rating: 4.5,
              totalRides: Math.floor(Math.random() * 50),
              totalEarning: Math.floor(Math.random() * 10000),
              walletBalance: Math.floor(Math.random() * 1000),
              documents: {
                license: { status: "approved" },
                insurance: { status: "approved" },
                profilePhoto: { status: "approved" },
                vehicleRegistration: { status: "approved" },
              },
              termsAccepted: true,
              city: user.city || "Karachi",
            });
            
            await newRider.save();
            console.log(`✅ Created rider for user: ${user.name} (${user.email})`);
          }
        }
      }
    } else {
      console.log("✅ Riders found, checking data...");
      
      // Get sample riders with populated user data
      const sampleRiders = await Rider.find()
        .populate("user", "name email phoneNumber profileImage city country createdAt")
        .limit(3)
        .lean();
      
      console.log("📋 Sample riders:");
      sampleRiders.forEach((rider, index) => {
        console.log(`${index + 1}. ${rider.user?.name || 'No Name'} - ${rider.user?.email || 'No Email'} - Status: ${rider.status}`);
      });
    }

    // Test the admin API query
    console.log("\n🔍 Testing admin API query...");
    const adminQuery = {};
    const riders = await Rider.find(adminQuery)
      .populate("user", "name email phoneNumber profileImage city country createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`📊 Admin query returned ${riders.length} riders`);
    
    if (riders.length > 0) {
      console.log("✅ Sample data from admin query:");
      riders.slice(0, 3).forEach((rider, index) => {
        console.log(`${index + 1}. Name: ${rider.user?.name || 'N/A'}`);
        console.log(`   Email: ${rider.user?.email || 'N/A'}`);
        console.log(`   Status: ${rider.status}`);
        console.log(`   Verified: ${rider.isVerified}`);
        console.log(`   Vehicle: ${rider.vehicleDetails?.make || 'N/A'} ${rider.vehicleDetails?.model || 'N/A'}`);
        console.log("   ---");
      });
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

testRidersData();