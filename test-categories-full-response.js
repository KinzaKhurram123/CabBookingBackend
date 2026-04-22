const mongoose = require("mongoose");
require("dotenv").config();

const { getAllCategories } = require("./controllers/adminController");

async function testCategoriesFullResponse() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Test getAllCategories with pagination
    console.log("🧪 Testing getAllCategories with pagination...\n");
    let mockReq = { query: { page: 1, limit: 10 } };
    let responseData = null;
    let mockRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { responseData = data; return this; }
    };

    await getAllCategories(mockReq, mockRes);
    
    console.log("📋 Full API Response:");
    console.log(JSON.stringify(responseData, null, 2));

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

testCategoriesFullResponse();