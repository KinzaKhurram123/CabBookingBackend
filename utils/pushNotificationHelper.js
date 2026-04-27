const admin = require('firebase-admin');
const User = require('../models/user');
const Rider = require('../models/riderModel');

// Initialize Firebase Admin (only if not already initialized)
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return;

  try {
    // Check if Firebase credentials are available
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      console.warn('⚠️ Firebase credentials not found in .env - Push notifications disabled');
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
  }
};

// Initialize on module load
initializeFirebase();

/**
 * Send push notification to user/rider
 */
const sendPushNotification = async ({
  userId,
  userType = 'user',
  title,
  body,
  data = {},
  type = 'general',
  imageUrl = null
}) => {
  try {
    if (!firebaseInitialized) {
      console.log('Firebase not initialized - skipping push notification');
      return { success: false, message: 'Firebase not configured' };
    }

    // Get user/rider FCM tokens
    let tokens = [];
    if (userType === 'rider' || userType === 'driver') {
      const rider = await Rider.findById(userId).select('fcmTokens notificationSettings');
      if (rider && rider.notificationSettings?.pushEnabled && rider.fcmTokens?.length > 0) {
        tokens = rider.fcmTokens.map(t => t.token);
      }
    } else {
      const user = await User.findById(userId).select('fcmTokens notificationSettings');
      if (user && user.notificationSettings?.pushEnabled && user.fcmTokens?.length > 0) {
        tokens = user.fcmTokens.map(t => t.token);
      }
    }

    if (tokens.length === 0) {
      console.log(`No FCM tokens found for ${userType} ${userId}`);
      return { success: false, message: 'No FCM tokens registered' };
    }

    // Prepare notification payload
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        type: type,
        timestamp: new Date().toISOString(),
        // Convert all data values to strings (FCM requirement)
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
          return acc;
        }, {})
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'ride_updates',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    };

    if (imageUrl) {
      message.notification.imageUrl = imageUrl;
    }

    // Send to all tokens
    const results = await Promise.allSettled(
      tokens.map(token => 
        admin.messaging().send({ ...message, token })
      )
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Remove invalid tokens
    const invalidTokens = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const error = result.reason;
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[index]);
        }
      }
    });

    // Clean up invalid tokens from database
    if (invalidTokens.length > 0) {
      if (userType === 'rider' || userType === 'driver') {
        await Rider.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { token: { $in: invalidTokens } } }
        });
      } else {
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { token: { $in: invalidTokens } } }
        });
      }
      console.log(`Removed ${invalidTokens.length} invalid FCM tokens`);
    }

    console.log(`✅ Push notification sent: ${successful} success, ${failed} failed`);

    return {
      success: true,
      sent: successful,
      failed: failed,
      invalidTokensRemoved: invalidTokens.length
    };

  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification to multiple users
 */
const sendBulkPushNotification = async ({
  userIds,
  userType = 'user',
  title,
  body,
  data = {},
  type = 'general'
}) => {
  try {
    const results = await Promise.allSettled(
      userIds.map(userId =>
        sendPushNotification({ userId, userType, title, body, data, type })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return { success: true, sent: successful, failed: failed };
  } catch (error) {
    console.error('Bulk push notification error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotification,
  sendBulkPushNotification,
  initializeFirebase
};
