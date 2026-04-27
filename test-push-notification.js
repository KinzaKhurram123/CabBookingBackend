// Push Notification Test Script
require('dotenv').config();
const { sendPushNotification } = require('./utils/pushNotificationHelper');
const mongoose = require('mongoose');

async function testPushNotification() {
  try {
    console.log('🔥 Starting Push Notification Test...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get user ID from command line argument
    const userId = process.argv[2];
    
    if (!userId) {
      console.error('❌ Error: Please provide user ID as argument');
      console.log('Usage: node test-push-notification.js <USER_ID>');
      console.log('Example: node test-push-notification.js 507f1f77bcf86cd799439011\n');
      process.exit(1);
    }

    console.log('📱 Sending test notification to user:', userId);
    console.log('⏳ Please wait...\n');

    // Send test push notification
    const result = await sendPushNotification({
      userId: userId,
      userType: 'user',
      title: '🎉 Test Push Notification',
      body: 'This is a test push notification from backend! If you see this, push notifications are working perfectly! 🚀',
      data: {
        testId: Date.now().toString(),
        timestamp: new Date().toISOString(),
        source: 'backend_test_script'
      },
      type: 'test'
    });

    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Push notification sent successfully!');
      console.log(`📤 Sent to ${result.sent} device(s)`);
      if (result.failed > 0) {
        console.log(`⚠️  Failed: ${result.failed} device(s)`);
      }
      if (result.invalidTokensRemoved > 0) {
        console.log(`🗑️  Removed ${result.invalidTokensRemoved} invalid token(s)`);
      }
      console.log('\n📱 Check your mobile device for the notification!');
    } else {
      console.log('\n❌ Failed to send push notification');
      console.log('Error:', result.message || result.error);
      
      if (result.message === 'No FCM tokens registered') {
        console.log('\n💡 Tip: Make sure the user has registered their FCM token first');
        console.log('   Use the mobile app to login, or call POST /api/users/fcm-token');
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Test completed\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run test
testPushNotification();
