const Message = require("../models/messageModel");
const RideBooking = require("../models/rideBooking");
const User = require("../models/user");

const sendMessage = async (req, res) => {
  try {
    const { rideId, receiverId, content } = req.body;
    const senderId = req.user.id;

    console.log("Send message request:", {
      rideId,
      receiverId,
      content,
      senderId,
    });

    if (!rideId || !receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: "Please provide rideId, receiverId, and content",
      });
    }

    const ride = await RideBooking.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    const isDriver = ride.driver && ride.driver.toString() === senderId;
    const isRider = ride.user && ride.user.toString() === senderId;
    const isAdmin = req.user.role === "admin";

    if (!isDriver && !isRider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to send messages for this ride",
      });
    }

    const newMessage = await Message.create({
      rideId,
      sender: senderId,
      receiver: receiverId,
      content: content,
      isRead: false,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "name email profilePicture")
      .populate("receiver", "name email profilePicture");

    try {
      const pusher = require("../config/pusher");
      if (pusher) {
        await pusher.trigger(`ride-${rideId}`, "new-message", populatedMessage);
      }
    } catch (pusherError) {
      console.log("Pusher not configured, skipping:", pusherError.message);
    }

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending message",
      error: error.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;

    console.log(`Getting messages for ride: ${rideId}, user: ${userId}`);
    console.log(`RideId type: ${typeof rideId}, value: ${rideId}`);

    const mongoose = require("mongoose");
    const objectId = new mongoose.Types.ObjectId(rideId);

    console.log(`Converted to ObjectId: ${objectId}`);

    const ride = await RideBooking.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
        messages: [],
      });
    }

    const isDriver = ride.driver && ride.driver.toString() === userId;
    const isRider = ride.user && ride.user.toString() === userId;
    const isAdmin = req.user.role === "admin";

    if (!isDriver && !isRider && !isAdmin) {
      console.log(`Unauthorized: User ${userId} not in ride ${rideId}`);
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view messages for this ride",
        messages: [],
      });
    }

    // ✅ FIX: Use ObjectId for query
    const messages = await Message.find({ rideId: objectId }) // Use ObjectId
      .populate("sender", "name email profilePicture")
      .populate("receiver", "name email profilePicture")
      .sort({ createdAt: 1 })
      .lean(); // Add lean() for better performance

    console.log(`Found ${messages.length} messages`);
    console.log("Messages:", JSON.stringify(messages, null, 2));

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching messages",
      messages: [],
      error: error.message,
    });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;

    const ride = await RideBooking.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    const isAuthorized =
      (ride.driver && ride.driver.toString() === userId) ||
      (ride.user && ride.user.toString() === userId);

    if (!isAuthorized && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const result = await Message.updateMany(
      {
        rideId,
        receiver: userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking messages as read",
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Only sender or admin can delete
    if (message.sender.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this message",
      });
    }

    await message.deleteOne();

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting message",
    });
  }
};

const authenticatePusher = async (req, res) => {
  try {
    const pusher = require("../config/pusher");
    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;

    const rideId = channel.split("-")[2];

    const ride = await RideBooking.findById(rideId);
    if (!ride) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userId = req.user.id;
    const isAuthorized =
      (ride.driver && ride.driver.toString() === userId) ||
      (ride.user && ride.user.toString() === userId);

    if (!isAuthorized && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const authResponse = pusher.authenticate(socketId, channel, {
      user_id: userId,
      user_info: {
        name: req.user.name,
        email: req.user.email,
      },
    });

    res.send(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
};

const testChat = (req, res) => {
  res.json({
    success: true,
    message: "Chat routes are working!",
    timestamp: new Date().toISOString(),
  });
};

const debugRideAccess = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;

    const ride = await RideBooking.findById(rideId)
      .populate("user", "name email")
      .populate("driver", "name email");

    if (!ride) {
      return res.json({
        exists: false,
        message: "Ride not found",
      });
    }

    res.json({
      exists: true,
      rideId: ride._id,
      driverId: ride.driver?._id || ride.driver,
      riderId: ride.user?._id || ride.user,
      currentUserId: userId,
      isDriver:
        ride.driver &&
        (ride.driver._id?.toString() === userId ||
          ride.driver.toString() === userId),
      isRider:
        ride.user &&
        (ride.user._id?.toString() === userId ||
          ride.user.toString() === userId),
      rideData: {
        pickupLocation: ride.pickupLocationName,
        dropoffLocation: ride.dropoffLocationName,
        status: ride.status,
      },
    });
  } catch (error) {
    res.json({ error: error.message });
  }
};

const debugMessages = async (req, res) => {
  try {
    const { rideId } = req.params;

    const rawMessages = await Message.find({ rideId });

    const allMessages = await Message.find({});

    res.json({
      requestedRideId: rideId,
      requestedRideIdType: typeof rideId,
      requestedRideIdLength: rideId?.length,
      messagesForThisRide: rawMessages,
      allMessagesInDB: allMessages,
      messageCount: {
        forThisRide: rawMessages.length,
        total: allMessages.length,
      },
    });
  } catch (error) {
    res.json({ error: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
  authenticatePusher,
  testChat,
  debugRideAccess,
  debugMessages,
};
