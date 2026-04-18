const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
require("dotenv").config();

// Apni MongoDB URI - .env file se read karega
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/cab_booking";

console.log("Connecting to MongoDB...");

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Database connected"))
  .catch((err) => {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  });

// Admin Schema
const adminSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  permissions: Object,
  isActive: { type: Boolean, default: true },
});

const Admin = mongoose.model("Admin", adminSchema);

async function createSuperAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: "super@admin.com" });

    if (existingAdmin) {
      console.log("⚠️ Super Admin already exists!");
      console.log("Email:", existingAdmin.email);
      mongoose.disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("12345678", 10);

    // Create super admin
    await Admin.create({
      name: "Super Admin",
      email: "superadmin@gmail.com",
      password: hashedPassword,
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
    console.log("📧 Email: super@admin.com");
    console.log("🔑 Password: yourpassword");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    mongoose.disconnect();
  }
}

createSuperAdmin();
