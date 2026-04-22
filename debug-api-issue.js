const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const Admin = require("./models/admin");
const { generateToken } = require("./middleware/adminMiddleware");

async function debugAPIIssue() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if there are any admins
    const adminCount = await Admin.countDocuments();
    console.log(`👥 Total admins in database: ${adminCount}`);

    if (adminCount === 0) {
      console.log("❌ No admins found. Creating a test admin...");
      
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      
      const testAdmin = new Admin({
        name: "Test Admin",
        email: "admin@test.com",
        password: hashedPassword,
        role: "super_admin",
        isActive: true,
        permissions: {}
      });
      
      await testAdmin.save();
      console.log("✅ Test admin created:");
      console.log("   Email: admin@test.com");
      console.log("   Password: admin123");
    }

    // Get an admin and generate token
    const admin = await Admin.findOne({ isActive: true });
    if (admin) {
      const token = generateToken(admin._id);
      console.log("\n🔑 Admin Token for API testing:");
      console.log(`Bearer ${token}`);
      
      console.log("\n📋 Test the API with this curl command:");
      console.log(`curl -H "Authorization: Bearer ${token}" \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     "https://krystal-imaginable-hurtlingly.ngrok-free.dev/api/admin/drivers?page=1&limit=100"`);
      
      console.log("\n🔍 Compare with users endpoint:");
      console.log(`curl -H "Authorization: Bearer ${token}" \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     "https://krystal-imaginable-hurtlingly.ngrok-free.dev/api/admin/users?page=1&limit=100"`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

debugAPIIssue();