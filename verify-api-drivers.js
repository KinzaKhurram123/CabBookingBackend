const mongoose = require("mongoose");
require("dotenv").config();

const Rider = require("./models/riderModel");
const { getAllDrivers } = require("./controllers/adminController");

async function verifyAPIDrivers() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check riders in database
    const ridersCount = await Rider.countDocuments();
    console.log(`📊 Total riders in database: ${ridersCount}\n`);

    // Mock request and response
    const mockReq = {
      query: {
        page: 1,
        limit: 100
      }
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

    console.log("🧪 Testing getAllDrivers function...");
    await getAllDrivers(mockReq, mockRes);

    console.log(`\n✅ Response Status: ${mockRes.statusCode}`);
    console.log(`📋 Drivers returned: ${responseData.count}`);
    console.log(`📊 Total: ${responseData.total}`);
    
    if (responseData.data && responseData.data.length > 0) {
      console.log("\n✅ Drivers list:");
      responseData.data.forEach((driver, index) => {
        console.log(`   ${index + 1}. ${driver.name} - ${driver.vehicle.make} ${driver.vehicle.model}`);
      });
    } else {
      console.log("\n❌ No drivers returned!");
      console.log("\n🔍 Debugging info:");
      console.log(`   - Response: ${JSON.stringify(responseData, null, 2)}`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

verifyAPIDrivers();