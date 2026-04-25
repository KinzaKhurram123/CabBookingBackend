const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: "majority"
    });
    console.log("✅ MongoDB Connected Successfully!");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    console.log("⚠️  MongoDB connection failed. Server will continue running without database.");
    console.log("Make sure MongoDB is accessible from your network.");
    // Don't exit - allow server to run without DB for now
  }
};

module.exports = connectDB;
