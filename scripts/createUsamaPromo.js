const mongoose = require("mongoose");
const Promotion = require("../models/promotion");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoURI) {
  console.error("❌ MongoDB URI not found in environment variables");
  process.exit(1);
}

const createPromo = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Remove existing if any
    await Promotion.deleteOne({ code: "USAMA123" });

    // Create promo code with 100% off
    const promo = await Promotion.create({
      code: "USAMA123",
      description: "Usama Special 100% Off Promo Code",
      discountType: "percentage",
      discountValue: 100,
      minOrderAmount: 0,
      maxDiscountAmount: 10000, // high max discount
      validFrom: new Date(),
      validUntil: new Date("2036-12-31"), // Valid for a long time
      usageLimit: null, // Unlimited total usage
      perUserLimit: 100, // High limit per user
      applicableFor: ["all"],
      isActive: true,
    });

    console.log("✅ Promo Code USAMA123 created successfully!");
    console.log(promo);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating promo code:", error.message);
    process.exit(1);
  }
};

createPromo();
