const mongoose = require("mongoose");
require("dotenv").config();

const Role = require("./models/role");
const Permission = require("./models/permission");

async function checkRolesPermissions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check roles
    console.log("1️⃣  Checking Roles:");
    const rolesCount = await Role.countDocuments();
    console.log(`   Total roles: ${rolesCount}`);

    if (rolesCount > 0) {
      const roles = await Role.find().lean();
      console.log("   Roles:");
      roles.forEach((role, index) => {
        console.log(`   ${index + 1}. ${role.name} - ID: ${role._id}`);
      });
    } else {
      console.log("   ❌ No roles found");
    }

    // Check permissions
    console.log("\n2️⃣  Checking Permissions:");
    const permissionsCount = await Permission.countDocuments();
    console.log(`   Total permissions: ${permissionsCount}`);

    if (permissionsCount > 0) {
      const permissions = await Permission.find().lean();
      console.log("   Permissions:");
      permissions.forEach((perm, index) => {
        console.log(`   ${index + 1}. ${perm.name} - Module: ${perm.module} - Action: ${perm.action}`);
      });
    } else {
      console.log("   ❌ No permissions found");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

checkRolesPermissions();