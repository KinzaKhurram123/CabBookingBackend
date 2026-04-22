const mongoose = require("mongoose");
require("dotenv").config();

const { getAllCategories } = require("./controllers/adminController");

async function testCategoriesAPI() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Test getAllCategories
    console.log("🧪 Testing getAllCategories...");
    let mockReq = { query: {} };
    let responseData = null;
    let mockRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { responseData = data; return this; }
    };

    await getAllCategories(mockReq, mockRes);
    console.log(`   ✅ Response Status: ${mockRes.statusCode}`);
    console.log(`   📊 Categories returned: ${responseData.data.length}\n`);
    
    if (responseData.data && responseData.data.length > 0) {
      console.log("   Categories list:");
      responseData.data.forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.categoryDisplayName} (${cat.category}) - Capacity: ${cat.capacity}`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

testCategoriesAPI();