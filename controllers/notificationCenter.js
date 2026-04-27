const Notification = require("../models/notification");
const { sendNotification } = require("../utils/notificationHelper");

// ─── Get User Notifications ───────────────────────────────────────────────────
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, isRead } = req.query;

    const filter = { recipient: userId };
    if (isRead !== undefined) filter.isRead = isRead === "true";

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      unreadCount,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── Mark Single Notification as Read ────────────────────────────────────────
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Marked as read", data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── Mark All Notifications as Read ──────────────────────────────────────────
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── Delete Single Notification ───────────────────────────────────────────────
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── Delete All Notifications ─────────────────────────────────────────────────
exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    res.status(200).json({ success: true, message: "All notifications deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── Get Unread Count ─────────────────────────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json({ success: true, unreadCount: count });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── Test Notification (Simple Test Endpoint) ────────────────────────────────
exports.sendTestNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Send a test notification
    const notification = await sendNotification({
      recipientId: userId,
      recipientType: "user",
      title: "🎉 Test Notification",
      message: "This is a test notification! If you see this, notifications are working perfectly.",
      type: "test",
      data: {
        testId: Date.now(),
        timestamp: new Date().toISOString()
      },
      sendPush: true // Enable push notification
    });

    if (notification) {
      res.status(200).json({
        success: true,
        message: "Test notification sent successfully! Check your notifications (in-app + push).",
        notification: {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          createdAt: notification.createdAt
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send test notification"
      });
    }
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// ─── Register FCM Token ───────────────────────────────────────────────────────
exports.registerFCMToken = async (req, res) => {
  try {
    const { token, deviceType = 'android', deviceId } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required"
      });
    }

    // Determine if user or rider
    const User = require('../models/user');
    const Rider = require('../models/riderModel');

    let user = await User.findById(userId);
    let isRider = false;

    if (!user) {
      // Check if rider
      const rider = await Rider.findOne({ user: userId });
      if (rider) {
        user = rider;
        isRider = true;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if token already exists
    const existingTokenIndex = user.fcmTokens?.findIndex(t => t.token === token);

    if (existingTokenIndex !== -1) {
      // Update existing token
      user.fcmTokens[existingTokenIndex].lastUsed = new Date();
      user.fcmTokens[existingTokenIndex].deviceType = deviceType;
      if (deviceId) user.fcmTokens[existingTokenIndex].deviceId = deviceId;
    } else {
      // Add new token
      if (!user.fcmTokens) user.fcmTokens = [];
      user.fcmTokens.push({
        token,
        deviceType,
        deviceId,
        addedAt: new Date(),
        lastUsed: new Date()
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "FCM token registered successfully",
      data: {
        tokensCount: user.fcmTokens.length,
        deviceType
      }
    });

  } catch (error) {
    console.error("Register FCM token error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ─── Remove FCM Token ─────────────────────────────────────────────────────────
exports.removeFCMToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required"
      });
    }

    const User = require('../models/user');
    const Rider = require('../models/riderModel');

    // Try user first
    let updated = await User.findByIdAndUpdate(
      userId,
      { $pull: { fcmTokens: { token } } },
      { new: true }
    );

    // If not found, try rider
    if (!updated) {
      const rider = await Rider.findOne({ user: userId });
      if (rider) {
        updated = await Rider.findByIdAndUpdate(
          rider._id,
          { $pull: { fcmTokens: { token } } },
          { new: true }
        );
      }
    }

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "FCM token removed successfully",
      data: {
        tokensCount: updated.fcmTokens?.length || 0
      }
    });

  } catch (error) {
    console.error("Remove FCM token error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ─── Update Notification Settings ─────────────────────────────────────────────
exports.updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const settings = req.body;

    const User = require('../models/user');
    const Rider = require('../models/riderModel');

    let user = await User.findById(userId);
    let isRider = false;

    if (!user) {
      const rider = await Rider.findOne({ user: userId });
      if (rider) {
        user = rider;
        isRider = true;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update notification settings
    user.notificationSettings = {
      ...user.notificationSettings,
      ...settings
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: "Notification settings updated successfully",
      data: user.notificationSettings
    });

  } catch (error) {
    console.error("Update notification settings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
