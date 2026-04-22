const mongoose = require("mongoose");
require("dotenv").config();

const Role = require("./models/role");
const Permission = require("./models/permission");

async function createRolesPermissions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Create permissions first
    console.log("1️⃣  Creating permissions...\n");

    const permissionsData = [
      // User Management
      { name: "View Users", description: "Can view all users", module: "users", action: "read" },
      { name: "Create User", description: "Can create new users", module: "users", action: "create" },
      { name: "Edit User", description: "Can edit user details", module: "users", action: "update" },
      { name: "Delete User", description: "Can delete users", module: "users", action: "delete" },
      { name: "Manage Users", description: "Can manage all user operations", module: "users", action: "manage" },

      // Driver Management
      { name: "View Drivers", description: "Can view all drivers", module: "drivers", action: "read" },
      { name: "Create Driver", description: "Can create new drivers", module: "drivers", action: "create" },
      { name: "Edit Driver", description: "Can edit driver details", module: "drivers", action: "update" },
      { name: "Delete Driver", description: "Can delete drivers", module: "drivers", action: "delete" },
      { name: "Manage Drivers", description: "Can manage all driver operations", module: "drivers", action: "manage" },

      // Ride Management
      { name: "View Rides", description: "Can view all rides", module: "rides", action: "read" },
      { name: "Edit Ride", description: "Can edit ride details", module: "rides", action: "update" },
      { name: "Delete Ride", description: "Can delete rides", module: "rides", action: "delete" },
      { name: "Manage Rides", description: "Can manage all ride operations", module: "rides", action: "manage" },

      // Promotions
      { name: "View Promotions", description: "Can view all promotions", module: "promotions", action: "read" },
      { name: "Create Promotion", description: "Can create promotions", module: "promotions", action: "create" },
      { name: "Edit Promotion", description: "Can edit promotions", module: "promotions", action: "update" },
      { name: "Delete Promotion", description: "Can delete promotions", module: "promotions", action: "delete" },
      { name: "Manage Promotions", description: "Can manage all promotions", module: "promotions", action: "manage" },

      // Payments
      { name: "View Payments", description: "Can view all payments", module: "payments", action: "read" },
      { name: "Manage Payments", description: "Can manage all payment operations", module: "payments", action: "manage" },

      // Reports
      { name: "View Reports", description: "Can view all reports", module: "reports", action: "read" },
      { name: "Manage Reports", description: "Can manage all reports", module: "reports", action: "manage" },

      // Settings
      { name: "View Settings", description: "Can view settings", module: "settings", action: "read" },
      { name: "Edit Settings", description: "Can edit settings", module: "settings", action: "update" },
      { name: "Manage Settings", description: "Can manage all settings", module: "settings", action: "manage" },

      // Admin Management
      { name: "View Admins", description: "Can view all admins", module: "admins", action: "read" },
      { name: "Create Admin", description: "Can create new admins", module: "admins", action: "create" },
      { name: "Edit Admin", description: "Can edit admin details", module: "admins", action: "update" },
      { name: "Delete Admin", description: "Can delete admins", module: "admins", action: "delete" },
      { name: "Manage Admins", description: "Can manage all admin operations", module: "admins", action: "manage" },
    ];

    const createdPermissions = [];
    for (let permData of permissionsData) {
      const existingPerm = await Permission.findOne({ name: permData.name });
      if (!existingPerm) {
        const perm = new Permission(permData);
        await perm.save();
        createdPermissions.push(perm);
        console.log(`   ✅ Created: ${permData.name}`);
      } else {
        createdPermissions.push(existingPerm);
        console.log(`   ⏭️  Already exists: ${permData.name}`);
      }
    }

    console.log(`\n✅ Total permissions: ${createdPermissions.length}\n`);

    // Create roles
    console.log("2️⃣  Creating roles...\n");

    const rolesData = [
      {
        name: "super_admin",
        description: "Full access to all features",
        permissions: {
          manageUsers: true,
          manageDrivers: true,
          manageRides: true,
          managePayments: true,
          managePromotions: true,
          viewReports: true,
          manageAdmins: true,
          manageSettings: true,
        },
      },
      {
        name: "admin",
        description: "Can manage users, drivers, and rides",
        permissions: {
          manageUsers: true,
          manageDrivers: true,
          manageRides: true,
          managePayments: true,
          managePromotions: true,
          viewReports: true,
          manageAdmins: false,
          manageSettings: false,
        },
      },
      {
        name: "manager",
        description: "Can moderate users and drivers",
        permissions: {
          manageUsers: true,
          manageDrivers: true,
          manageRides: false,
          managePayments: false,
          managePromotions: false,
          viewReports: true,
          manageAdmins: false,
          manageSettings: false,
        },
      },
      {
        name: "support",
        description: "Can view users and rides for support",
        permissions: {
          manageUsers: false,
          manageDrivers: false,
          manageRides: false,
          managePayments: false,
          managePromotions: false,
          viewReports: true,
          manageAdmins: false,
          manageSettings: false,
        },
      },
    ];

    for (let roleData of rolesData) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        const role = new Role(roleData);
        await role.save();
        console.log(`   ✅ Created: ${roleData.name}`);
      } else {
        console.log(`   ⏭️  Already exists: ${roleData.name}`);
      }
    }

    // Verify the results
    console.log("\n🧪 Verifying created data:\n");

    const allRoles = await Role.find().lean();
    console.log(`📊 Total roles: ${allRoles.length}`);
    allRoles.forEach((role, index) => {
      console.log(`   ${index + 1}. ${role.name} - ${role.description}`);
    });

    const allPermissions = await Permission.find().lean();
    console.log(`\n📊 Total permissions: ${allPermissions.length}`);
    allPermissions.slice(0, 5).forEach((perm, index) => {
      console.log(`   ${index + 1}. ${perm.name} (${perm.module}/${perm.action})`);
    });
    if (allPermissions.length > 5) {
      console.log(`   ... and ${allPermissions.length - 5} more`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

createRolesPermissions();