const mongoose = require("mongoose");
require("dotenv").config();

const jwt = require("jsonwebtoken");
const User = require("./models/user");
const { protect } = require("./middleware/authMiddleware");
const { getProfile } = require("./controllers/authController");

async function testAuthMiddleware() {
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

    // Generate a token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    console.log(`🔑 Generated token: ${token.substring(0, 50)}...\n`);

    // Mock request with authorization header
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    let middlewareError = null;
    let middlewareCalled = false;

    const mockRes = {
      status: function(code) { 
        this.statusCode = code; 
        return this; 
      },
      json: function(data) { 
        this.data = data; 
        return this; 
      }
    };

    const mockNext = () => {
      middlewareCalled = true;
      console.log("✅ Middleware passed, next() called");
      console.log(`✅ req.user set to: ${mockReq.user._id}`);
    };

    console.log("🧪 Testing protect middleware...");
    await protect(mockReq, mockRes, mockNext);

    if (middlewareCalled) {
      console.log("\n✅ Middleware successful!\n");

      // Now test getProfile
      console.log("🧪 Testing getProfile function...");
      let profileResponse = null;
      const profileRes = {
        status: function(code) { 
          this.statusCode = code; 
          return this; 
        },
        json: function(data) { 
          profileResponse = data; 
          return this; 
        }
      };

      await getProfile(mockReq, profileRes);
      console.log(`\n✅ getProfile Response Status: ${profileRes.statusCode}`);
      console.log("📋 User data returned:");
      console.log(`   Name: ${profileResponse.name}`);
      console.log(`   Email: ${profileResponse.email}`);
      console.log(`   Role: ${profileResponse.role}`);
    } else {
      console.log("\n❌ Middleware failed!");
      console.log("Response:", mockRes.data);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected");
  }
}

testAuthMiddleware();