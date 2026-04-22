const mongoose = require("mongoose");
require("dotenv").config();

const RideType = require("./models/rideType");

async function createTestCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const categoriesData = [
      {
        category: "economy",
        categoryDisplayName: "Economy",
        categoryDescription: "Budget-friendly rides",
        capacity: 4,
        icon: "🚗",
        order: 1,
      },
      {
        category: "standard",
        categoryDisplayName: "Standard",
        categoryDescription: "Comfortable standard rides",
        capacity: 4,
        icon: "🚙",
        order: 2,
      },
      {
        category: "premium",
        categoryDisplayName: "Premium",
        categoryDescription: "Luxury premium rides",
        capacity: 4,
        icon: "🚕",
        order: 3,
      },
      {
        category: "special",
        categoryDisplayName: "Special",
        categoryDescription: "Special purpose rides",
        capacity: 6,
        icon: "🚐",
        order: 4,
      },
    ];

    console.log("🚗 Creating test categories...\n");

    for (let catData of categoriesData) {
      const existingCat = await RideType.findOne({ category: catData.category });
      if (!existingCat) {
        const rideType = new RideType(catData);
        await rideType.save();
        console.log(`   ✅ Created: ${catData.categoryDisplayName}`);
      } else {
        console.log(`   ⏭️  Already exists: ${catData.categoryDisplayName}`);
      }
    }

    // Verify the results
    console.log("\n🧪 Verifying created categories:\n");
    const allCategories = await RideType.find().sort({ order: 1 }).lean();
    console.log(`📊 Total categories: ${allCategories.length}`);
    allCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.categoryDisplayName} (${cat.category}) - Capacity: ${cat.capacity}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

createTestCategories();