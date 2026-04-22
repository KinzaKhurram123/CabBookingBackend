// Test script to check which user you're logged in as
// Run this to see your current user ID from the token

const jwt = require("jsonwebtoken");

// Paste your Bearer token here (without "Bearer " prefix)
const token = "YOUR_TOKEN_HERE";

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
  console.log("✅ Decoded Token:");
  console.log("User ID:", decoded.id || decoded._id);
  console.log("Email:", decoded.email);
  console.log("Role:", decoded.role);
  console.log("\n📝 This is the user ID that will be used in the API call");
  console.log("The parcel booking belongs to user: 69e606987683ac9829b7e940");
  console.log("Match:", (decoded.id || decoded._id) === "69e606987683ac9829b7e940" ? "✅ YES" : "❌ NO");
} catch (error) {
  console.error("❌ Error decoding token:", error.message);
  console.log("\n💡 To use this script:");
  console.log("1. Login to get your token");
  console.log("2. Replace YOUR_TOKEN_HERE with your actual token");
  console.log("3. Run: node test-current-user.js");
}
