const mongoose = require("mongoose");
require("dotenv").config();

// Import models and controller
const User = require("./models/user");
const { getAllUsers } = require("./controllers/adminController");

async function testGetAllUsersFunction() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Mock request and response objects
    const mockReq = {
      query: {
        page: 1,
        limit: 100
      }
    };

    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log(`📊 Response Status: ${this.statusCode}`);
        console.log("📋 Response Data:", JSON.stringify(data, null, 2));
        return this;
      }
    };

    console.log("🔍 Testing getAllUsers function directly...");
    
    // Call the function directly
    await getAllUsers(mockReq, mockRes);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

testGetAllUsersFunction();