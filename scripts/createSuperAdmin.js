const mongoose = require("mongoose");
const Admin = require("../models/admin");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoURI) {
  console.error("❌ MongoDB URI not found in environment variables");
  console.log("Please add MONGO_URI or MONGODB_URI to your .env file");
  process.exit(1);
}

console.log("📡 Connecting to DigitalOcean MongoDB...");
console.log("URI:", mongoURI.replace(/\/\/(.*)@/, "//***:***@"));

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to DigitalOcean MongoDB");

    const superAdminExists = await Admin.findOne({ role: "super_admin" });

    if (superAdminExists) {
      console.log("⚠️ Super Admin already exists:", superAdminExists.email);
      console.log("📧 Email:", superAdminExists.email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("SuperAdmin123!", 10);

    const superAdmin = await Admin.create({
      name: "Super Admin",
      email: "superadmin@example.com",
      password: hashedPassword,
      phoneNumber: "+1234567890",
      role: "super_admin",
      permissions: {
        manageRiders: true,
        manageDrivers: true,
        manageUsers: true,
        managePayments: true,
        viewReports: true,
      },
      isActive: true,
    });

    console.log("✅ Super Admin created successfully!");
    console.log("📧 Email:", superAdmin.email);
    console.log("🔑 Password: SuperAdmin123!");
    console.log("⚠️ Please change this password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating super admin:", error.message);
    if (error.message.includes("ECONNREFUSED")) {
      console.log(
        "\n💡 Tip: Check if your IP is whitelisted in DigitalOcean MongoDB firewall",
      );
    }
    process.exit(1);
  }
};

createSuperAdmin();
