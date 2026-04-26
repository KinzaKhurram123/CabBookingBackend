const mongoose = require("mongoose");
const Promotion = require("./models/promotion");

// MongoDB connection with timeout settings
mongoose
  .connect("mongodb://localhost:27017/ridelynk_prod", {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.log("❌ MongoDB Connection Error:", err.message);
    console.log("\n💡 Solutions:");
    console.log("1. Start MongoDB service: net start MongoDB");
    console.log("2. Or run: mongod --dbpath C:\\data\\db");
    console.log("3. Check if MongoDB is running on port 27017");
    process.exit(1);
  });

async function createPromoCode() {
  try {
    // Check if promo already exists
    const existing = await Promotion.findOne({ code: "RIDELYNK123" });
    if (existing) {
      console.log("⚠️  Promo code RIDELYNK123 already exists!");
      console.log("Existing promo:", existing);
      process.exit(0);
    }

    // Create new promo code
    const promo = await Promotion.create({
      code: "RIDELYNK123",
      description: "20% discount on all rides - RideLynk Special",
      discountType: "percentage",
      discountValue: 20,
      minOrderAmount: 0, // No minimum
      maxDiscountAmount: 500, // Maximum discount cap of 500
      validFrom: new Date(),
      validUntil: new Date("2025-12-31"), // Valid till end of 2025
      usageLimit: null, // Unlimited uses
      perUserLimit: 5, // Each user can use 5 times
      applicableFor: ["all"], // Available for all users
      isActive: true,
    });

    console.log("✅ Promo code created successfully!");
    console.log("\n📋 Promo Details:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Code:              ${promo.code}`);
    console.log(`Description:       ${promo.description}`);
    console.log(`Discount:          ${promo.discountValue}%`);
    console.log(`Max Discount:      $${promo.maxDiscountAmount}`);
    console.log(`Min Order:         $${promo.minOrderAmount}`);
    console.log(`Valid From:        ${promo.validFrom.toLocaleDateString()}`);
    console.log(`Valid Until:       ${promo.validUntil.toLocaleDateString()}`);
    console.log(`Usage Limit:       ${promo.usageLimit || "Unlimited"}`);
    console.log(`Per User Limit:    ${promo.perUserLimit} times`);
    console.log(`Applicable For:    ${promo.applicableFor.join(", ")}`);
    console.log(`Status:            ${promo.isActive ? "Active ✅" : "Inactive ❌"}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🎉 Users can now use code: RIDELYNK123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating promo code:", error);
    process.exit(1);
  }
}

// Run the script
createPromoCode();
