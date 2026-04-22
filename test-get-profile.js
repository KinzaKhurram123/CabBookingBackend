const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/user");
const { getProfile } = require("./controllers/authController");

async function testGetProfile() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get a test user
    const user = await User.findOne().select("-password");
    
    if (!user) {
      console.log("❌ No users found in database");
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user._id})\n`);

    // Mock request with user
    const mockReq = {
      user: user
    };

    let responseData = null;
    const mockRes = {
      status: function(code) { 
        this.statusCode = code; 
        return this; 
      },
      json: function(data) { 
        responseData = data; 
        return this; 
      }
    };

    console.log("🧪 Testing getProfile function...");
    await getProfile(mockReq, mockRes);

    console.log(`\n✅ Response Status: ${mockRes.statusCode}`);
    console.log("📋 Response Data:");
    console.log(JSON.stringify(responseData, null, 2));

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

testGetProfile();