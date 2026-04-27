const Notification = require("../models/notification");
const pusher = require("../config/pusher");
const { sendPushNotification } = require("./pushNotificationHelper");

/**
 * Create a notification and send via Pusher + Push Notification
 * @param {Object} options
 * @param {string} options.recipientId - User ID
 * @param {string} options.recipientType - "user" | "driver" | "admin"
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.type - Notification type
 * @param {Object} options.data - Extra data (bookingId, etc.)
 * @param {boolean} options.sendPush - Send push notification (default: true)
 */
const sendNotification = async ({
  recipientId,
  recipientType = "user",
  title,
  message,
  type = "general",
  data = {},
  sendPush = true,
}) => {
  try {
    // Save to DB
    const notification = await Notification.create({
      recipient: recipientId,
      recipientType,
      title,
      message,
      type,
      data,
    });

    // Send via Pusher in realtime (for in-app notifications)
    const channel = `notifications-${recipientId}`;
    await pusher.trigger(channel, "new-notification", {
      _id: notification._id,
      title,
      message,
      type,
      data,
      isRead: false,
      createdAt: notification.createdAt,
    });

    // Send push notification (for background/foreground notifications)
    if (sendPush) {
      await sendPushNotification({
        userId: recipientId,
        userType: recipientType === 'driver' ? 'rider' : recipientType,
        title,
        body: message,
        data: {
          notificationId: notification._id.toString(),
          ...data
        },
        type
      });
    }

    return notification;
  } catch (error) {
    console.error("Notification error (non-critical):", error.message);
    return null;
  }
};

module.exports = { sendNotification };
