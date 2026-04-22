const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/user");
const Rider = require("./models/riderModel");
const bcrypt = require("bcryptjs");

async function createPendingRiders() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const pendingRidersData = [
      {
        name: "Pending Driver 1",
        email: "pending1@example.com",
        phoneNumber: "03001111111",
        city: "Lahore",
        country: "Pakistan",
        vehicle: {
          category: "car",
          vehicleType: "sedan",
          make: "BMW",
          model: "3 Series",
          year: "2023",
          color: "Blue",
          licensePlate: "PND-001",
        },
      },
      {
        name: "Pending Driver 2",
        email: "pending2@example.com",
        phoneNumber: "03002222222",
        city: "Islamabad",
        country: "Pakistan",
        vehicle: {
          category: "car",
          vehicleType: "suv",
          make: "Mercedes",
          model: "C-Class",
          year: "2022",
          color: "Black",
          licensePlate: "PND-002",
        },
      },
      {
        name: "Pending Driver 3",
        email: "pending3@example.com",
        phoneNumber: "03003333333",
        city: "Karachi",
        country: "Pakistan",
        vehicle: {
          category: "car",
          vehicleType: "sedan",
          make: "Audi",
          model: "A4",
          year: "2021",
          color: "White",
          licensePlate: "PND-003",
        },
      },
    ];

    console.log("🚗 Creating pending riders...\n");

    for (let driverData of pendingRidersData) {
      // Check if user already exists
      let user = await User.findOne({ email: driverData.email });

      if (!user) {
        const hashedPassword = await bcrypt.hash("password123", 10);
        user = new User({
          name: driverData.name,
          email: driverData.email,
          phoneNumber: driverData.phoneNumber,
          city: driverData.city,
          country: driverData.country,
          password: hashedPassword,
          role: "driver",
        });
        await user.save();
        console.log(`✅ Created user: ${driverData.name}`);
      } else {
        console.log(`⏭️  User already exists: ${driverData.name}`);
      }

      // Check if rider already exists
      let rider = await Rider.findOne({ user: user._id });

      if (!rider) {
        rider = new Rider({
          user: user._id,
          phoneNumber: driverData.phoneNumber,
          vehicleDetails: driverData.vehicle,
          status: "pending_verification",
          isVerified: false,
          verificationStatus: "pending",
          rating: 0,
          totalRides: 0,
          totalEarning: 0,
          walletBalance: 0,
          documents: {
            license: { status: "pending" },
            insurance: { status: "pending" },
            profilePhoto: { status: "pending" },
            vehicleRegistration: { status: "pending" },
          },
          termsAccepted: false,
          city: driverData.city,
        });
        await rider.save();
        console.log(`✅ Created pending rider: ${driverData.name}`);
      } else {
        console.log(`⏭️  Rider already exists for: ${driverData.name}`);
      }
    }

    // Verify the results
    console.log("\n🧪 Verifying pending riders:");
    const pendingRiders = await Rider.find({
      verificationStatus: "pending",
      isVerified: false,
    })
      .populate("user", "name email city")
      .lean();

    console.log(`\n📊 Total pending riders: ${pendingRiders.length}`);
    pendingRiders.forEach((rider, index) => {
      console.log(`${index + 1}. ${rider.user?.name || "N/A"} - ${rider.user?.city || "N/A"} - ${rider.vehicleDetails?.make} ${rider.vehicleDetails?.model}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

createPendingRiders();