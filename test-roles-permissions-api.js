const mongoose = require("mongoose");
require("dotenv").config();

const { getAllRoles, getAllPermissions } = require("./controllers/adminController");

async function testRolesPermissionsAPI() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Test getAllRoles
    console.log("1️⃣  Testing getAllRoles...");
    let mockReq = { query: {} };
    let responseData = null;
    let mockRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { responseData = data; return this; }
    };

    await getAllRoles(mockReq, mockRes);
    console.log(`   ✅ Response Status: ${mockRes.statusCode}`);
    console.log(`   📊 Roles returned: ${responseData.data.length}\n`);
    
    if (responseData.data && responseData.data.length > 0) {
      console.log("   Roles list:");
      responseData.data.forEach((role, index) => {
        console.log(`   ${index + 1}. ${role.name} - ${role.description}`);
      });
    }

    // Test getAllPermissions
    console.log("\n2️⃣  Testing getAllPermissions...");
    mockReq = { query: {} };
    responseData = null;
    mockRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { responseData = data; return this; }
    };

    await getAllPermissions(mockReq, mockRes);
    console.log(`   ✅ Response Status: ${mockRes.statusCode}`);
    console.log(`   📊 Permissions returned: ${responseData.data.length}\n`);
    
    if (responseData.data && responseData.data.length > 0) {
      console.log("   First 5 permissions:");
      responseData.data.slice(0, 5).forEach((perm, index) => {
        console.log(`   ${index + 1}. ${perm.name} (${perm.module}/${perm.action})`);
      });
      if (responseData.data.length > 5) {
        console.log(`   ... and ${responseData.data.length - 5} more`);
      }
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

testRolesPermissionsAPI();