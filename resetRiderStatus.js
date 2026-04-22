// Script to reset rider status to available
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Rider = require('./models/riderModel');

async function resetRiderStatus(riderId) {
  try {
    const result = await Rider.findByIdAndUpdate(
      riderId,
      {
        $set: {
          status: 'available',
          currentRide: null,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (result) {
      console.log('✅ Rider status updated successfully!');
      console.log('Rider:', result.name || result._id);
      console.log('New Status:', result.status);
      console.log('Current Ride:', result.currentRide);
    } else {
      console.log('❌ Rider not found with ID:', riderId);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

// Get rider ID from command line argument
const riderId = process.argv[2];
if (!riderId) {
  console.log('Usage: node resetRiderStatus.js <RIDER_ID>');
  console.log('Example: node resetRiderStatus.js 67a1b2c3d4e5f67890123456');
  process.exit(1);
}

resetRiderStatus(riderId);