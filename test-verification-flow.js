const mongoose = require("mongoose");
require("dotenv").config();

const Rider = require("./models/riderModel");
const { getPendingVerifications, approveVerification } = require("./controllers/adminController");

async function testVerificationFlow() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Step 1: Get pending verifications
    console.log("1️⃣  Getting pending verifications...");
    let mockReq = { query: {} };
    let responseData = null;
    let mockRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { responseData = data; return this; }
    };

    await getPendingVerifications(mockReq, mockRes);
    console.log(`   ✅ Found ${responseData.data.length} pending riders\n`);

    if (responseData.data.length > 0) {
      const firstRider = responseData.data[0];
      console.log(`2️⃣  Approving first rider: ${firstRider.user?.name || 'N/A'}`);
      console.log(`   Rider ID: ${firstRider._id}`);

      // Step 2: Approve verification
      mockReq = { params: { id: firstRider._id } };
      responseData = null;
      mockRes = {
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { responseData = data; return this; }
      };

      await approveVerification(mockReq, mockRes);
      console.log(`   ✅ Response: ${responseData.message}\n`);

      // Step 3: Verify the rider was updated
      console.log("3️⃣  Verifying rider was updated...");
      const updatedRider = await Rider.findById(firstRider._id).lean();
      console.log(`   Verification Status: ${updatedRider.verificationStatus}`);
      console.log(`   Is Verified: ${updatedRider.isVerified}`);
      console.log(`   Status: ${updatedRider.status}`);
      console.log(`   ✅ Rider successfully approved!\n`);

      // Step 4: Check remaining pending riders
      console.log("4️⃣  Checking remaining pending riders...");
      responseData = null;
      mockRes = {
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { responseData = data; return this; }
      };

      await getPendingVerifications(mockReq, mockRes);
      console.log(`   ✅ Remaining pending riders: ${responseData.data.length}`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

testVerificationFlow();