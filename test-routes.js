const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const adminRoutes = require('./routes/adminRoutes');

async function testRoutes() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Create express app
    const app = express();
    app.use(express.json());

    // Use admin routes
    app.use('/api/admin', adminRoutes);

    // Start server
    const server = app.listen(3001, () => {
      console.log('🚀 Test server running on port 3001');
      console.log('📋 Available routes:');
      console.log('  GET /api/admin/users');
      console.log('  GET /api/admin/drivers');
      console.log('');
      console.log('🔍 Test these endpoints:');
      console.log('  curl http://localhost:3001/api/admin/users');
      console.log('  curl http://localhost:3001/api/admin/drivers');
      console.log('');
      console.log('⚠️  Note: These will fail with 401 (authentication required)');
      console.log('   But you should see different error messages for each route');
    });

    // Keep server running for 30 seconds
    setTimeout(() => {
      server.close();
      mongoose.disconnect();
      console.log('🔌 Server stopped and disconnected from MongoDB');
    }, 30000);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRoutes();