const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/user");
const Rider = require("./models/riderModel");
const bcrypt = require("bcryptjs");

async function createTestDrivers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Create test users and riders
    const testDriversData = [
      {
        name: "Ahmed Khan",
        email: "ahmed.khan@example.com",
        phoneNumber: "03001234567",
        city: "Lahore",
        country: "Pakistan",
        vehicle: {
          category: "car",
          vehicleType: "sedan",
          make: "Honda",
          model: "Civic",
          year: "2021",
          color: "Silver",
          licensePlate: "LHR-001",
        },
      },
      {
        name: "Fatima Ali",
        email: "fatima.ali@example.com",
        phoneNumber: "03009876543",
        city: "Islamabad",
        country: "Pakistan",
        vehicle: {
          category: "car",
          vehicleType: "hatchback",
          make: "Toyota",
          model: "Yaris",
          year: "2020",
          color: "Red",
          licensePlate: "ISB-002",
        },
      },
      {
        name: "Muhammad Hassan",
        email: "hassan.m@example.com",
        phoneNumber: "03105555555",
        city: "Karachi",
        country: "Pakistan",
        vehicle: {
          category: "car",
          vehicleType: "sedan",
          make: "Suzuki",
          model: "Cultus",
          year: "2019",
          color: "White",
          licensePlate: "KHI-003",
        },
      },
      {
        name: "Zainab Malik",
        email: "zainab.malik@example.com",
        phoneNumber: "03214444444",
        city: "Rawalpindi",
        country: "Pakistan",
        vehicle: {
          category: "car",
          vehicleType: "sedan",
          make: "Hyundai",
          model: "Elantra",
          year: "2022",
          color: "Black",
          licensePlate: "RWP-004",
        },
      },
      {
        name: "Ali Raza",
        email: "ali.raza@example.com",
        phoneNumber: "03333333333",
        city: "Multan",
        country: "Pakistan",
        vehicle: {
          category: "car",
          vehicleType: "suv",
          make: "KIA",
          model: "Sportage",
          year: "2023",
          color: "Blue",
          licensePlate: "MLT-005",
        },
      },
    ];

    console.log("\n🚗 Creating test drivers...");

    for (let driverData of testDriversData) {
      // Check if user already exists
      let user = await User.findOne({ email: driverData.email });

      if (!user) {
        // Create new user
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

      // Check if rider already exists for this user
      let rider = await Rider.findOne({ user: user._id });

      if (!rider) {
        // Create new rider
        rider = new Rider({
          user: user._id,
          phoneNumber: driverData.phoneNumber,
          vehicleDetails: driverData.vehicle,
          status: "available",
          isVerified: true,
          verificationStatus: "approved",
          rating: 4.5 + Math.random() * 0.5,
          totalRides: Math.floor(Math.random() * 100),
          totalEarning: Math.floor(Math.random() * 50000),
          walletBalance: Math.floor(Math.random() * 5000),
          documents: {
            license: { status: "approved" },
            insurance: { status: "approved" },
            profilePhoto: { status: "approved" },
            vehicleRegistration: { status: "approved" },
          },
          termsAccepted: true,
          city: driverData.city,
        });
        await rider.save();
        console.log(`✅ Created rider: ${driverData.name}`);
      } else {
        console.log(`⏭️  Rider already exists for: ${driverData.name}`);
      }
    }

    // Verify the results
    console.log("\n🧪 Verifying created drivers:");
    const allRiders = await Rider.find()
      .populate("user", "name email city")
      .lean();

    console.log(`\n📊 Total drivers: ${allRiders.length}`);
    allRiders.forEach((rider, index) => {
      console.log(`${index + 1}. ${rider.user?.name || "N/A"} - ${rider.user?.city || "N/A"} - ${rider.vehicleDetails?.make} ${rider.vehicleDetails?.model}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

createTestDrivers();