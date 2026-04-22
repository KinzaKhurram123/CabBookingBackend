const mongoose = require("mongoose");
require("dotenv").config();

const { getPendingVerifications } = require("./controllers/adminController");

async function testPendingVerifications() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Mock request and response
    const mockReq = {
      query: {}
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

    console.log("🧪 Testing getPendingVerifications function...\n");
    await getPendingVerifications(mockReq, mockRes);

    console.log(`✅ Response Status: ${mockRes.statusCode}`);
    console.log(`📊 Pending riders: ${responseData.data.length}\n`);
    
    if (responseData.data && responseData.data.length > 0) {
      console.log("✅ Pending riders list:");
      responseData.data.forEach((rider, index) => {
        console.log(`   ${index + 1}. ${rider.user?.name || 'N/A'} - ${rider.vehicleDetails?.make} ${rider.vehicleDetails?.model}`);
        console.log(`      Status: ${rider.verificationStatus}, Verified: ${rider.isVerified}`);
      });
    } else {
      console.log("❌ No pending riders returned!");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

testPendingVerifications();