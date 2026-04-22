const mongoose = require("mongoose");
require("dotenv").config();

const { getUserRideHistory } = require("./controllers/rideBookingController");

async function testRideHistoryAPI() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const userId = "69e236866bb93efa827a466a";

    // Mock request
    const mockReq = {
      params: { userId },
      query: { page: 1, limit: 20 }
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

    console.log("🧪 Testing getUserRideHistory function...\n");
    await getUserRideHistory(mockReq, mockRes);

    console.log(`✅ Response Status: ${mockRes.statusCode}`);
    console.log(`📊 Rides returned: ${responseData.data.length}`);
    console.log(`📋 Total rides: ${responseData.pagination.total}\n`);
    
    if (responseData.data && responseData.data.length > 0) {
      console.log("✅ Sample ride:");
      const ride = responseData.data[0];
      console.log(`   ID: ${ride.id}`);
      console.log(`   Type: ${ride.type}`);
      console.log(`   Status: ${ride.status}`);
      console.log(`   Fare: ${ride.fare}`);
      console.log(`   Pickup: ${ride.pickup.name}`);
      console.log(`   Dropoff: ${ride.dropoff.name}`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

testRideHistoryAPI();