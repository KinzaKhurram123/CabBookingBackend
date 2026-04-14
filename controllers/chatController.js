const Message = require("../models/messageModel");
const RideBooking = require("../models/rideBooking");
const ParcelBooking = require("../models/parcelBooking");
const PetDeliveryBooking = require("../models/petDeliveryBooking");
const User = require("../models/user");
const pusher = require("../config/pusher");

const sendMessage = async (req, res) => {
  try {
    // Support both rideId (old) and bookingId+bookingType (new)
    const bookingId = req.body.bookingId || req.body.rideId;
    const bookingType = req.body.bookingType || "ride";
    const { receiverId, content } = req.body;
    const senderId = req.user._id || req.user.id;

    if (!bookingId || !receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: "Please provide bookingId (or rideId), receiverId, and content",
      });
    }

    // Find booking based on type
    let booking = null;
    if (bookingType === "parcel") {
      booking = await ParcelBooking.findById(bookingId);
    } else if (bookingType === "pet") {
      booking = await PetDeliveryBooking.findById(bookingId);
    } else {
      booking = await RideBooking.findById(bookingId);
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    const isUser = booking.user?.toString() === senderId.toString();
    const isDriver = booking.driver?.toString() === senderId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isUser && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to send messages for this booking",
      });
    }

    const newMessage = await Message.create({
      bookingId,
      bookingType,
      rideId: bookingType === "ride" ? bookingId : undefined, // backward compat
      sender: senderId,
      receiver: receiverId,
      content,
      isRead: false,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "name email profileImage")
      .populate("receiver", "name email profileImage");

    // Pusher channel: ride-{id}, parcel-chat-{id}, pet-chat-{id}
    const channel = bookingType === "ride"
      ? `ride-${bookingId}`
      : `${bookingType}-chat-${bookingId}`;

    try {
      await pusher.trigger(channel, "new-message", populatedMessage);
    } catch (pusherError) {
      console.log("Pusher error (non-critical):", pusherError.message);
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
    const { rideId } = req.params; // rideId param = bookingId (same route)
    const bookingType = req.query.bookingType || "ride";
    const userId = req.user._id || req.user.id;

    const mongoose = require("mongoose");
    const objectId = new mongoose.Types.ObjectId(rideId);

    // Find booking based on type
    let booking = null;
    if (bookingType === "parcel") {
      booking = await ParcelBooking.findById(rideId);
    } else if (bookingType === "pet") {
      booking = await PetDeliveryBooking.findById(rideId);
    } else {
      booking = await RideBooking.findById(rideId);
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
        messages: [],
      });
    }

    const isUser = booking.user?.toString() === userId.toString();
    const isDriver = booking.driver?.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isUser && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view messages for this booking",
        messages: [],
      });
    }

    // For ride: query by rideId (backward compat), for others: by bookingId+bookingType
    const query = bookingType === "ride"
      ? { rideId: objectId }
      : { bookingId: objectId, bookingType };

    const messages = await Message.find(query)
      .populate("sender", "name email profileImage")
      .populate("receiver", "name email profileImage")
      .sort({ createdAt: 1 })
      .lean();

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
    const bookingType = req.query.bookingType || "ride";
    const userId = req.user._id || req.user.id;

    const query = bookingType === "ride"
      ? { rideId, receiver: userId, isRead: false }
      : { bookingId: rideId, bookingType, receiver: userId, isRead: false };

    const result = await Message.updateMany(query, {
      isRead: true,
      readAt: new Date(),
    });

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

// ─── PARCEL & PET CHAT ───────────────────────────────────────────────────────

// Helper to get booking by type
const getBooking = async (bookingId, bookingType) => {
  if (bookingType === "parcel") return await ParcelBooking.findById(bookingId);
  if (bookingType === "pet") return await PetDeliveryBooking.findById(bookingId);
  return await RideBooking.findById(bookingId);
};

const sendDeliveryMessage = async (req, res) => {
  try {
    const { bookingId, bookingType, receiverId, content } = req.body;
    const senderId = req.user._id || req.user.id;

    if (!bookingId || !bookingType || !receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: "bookingId, bookingType, receiverId, and content are required",
      });
    }

    if (!["parcel", "pet"].includes(bookingType)) {
      return res.status(400).json({
        success: false,
        message: "bookingType must be 'parcel' or 'pet'",
      });
    }

    const booking = await getBooking(bookingId, bookingType);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check sender is part of this booking (user or driver)
    const isUser = booking.user?.toString() === senderId.toString();
    const isDriver = booking.driver?.toString() === senderId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isUser && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to send messages for this booking",
      });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    const newMessage = await Message.create({
      bookingId,
      bookingType,
      sender: senderId,
      receiver: receiverId,
      content,
      isRead: false,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "name email profileImage")
      .populate("receiver", "name email profileImage");

    // Pusher real-time — channel: parcel-chat-{bookingId} or pet-chat-{bookingId}
    try {
      await pusher.trigger(
        `${bookingType}-chat-${bookingId}`,
        "new-message",
        populatedMessage,
      );
    } catch (pusherError) {
      console.error("Pusher error (non-critical):", pusherError.message);
    }

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("Send delivery message error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending message",
      error: error.message,
    });
  }
};

const getDeliveryMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { bookingType } = req.query; // ?bookingType=parcel or ?bookingType=pet
    const userId = req.user._id || req.user.id;

    if (!bookingType || !["parcel", "pet"].includes(bookingType)) {
      return res.status(400).json({
        success: false,
        message: "bookingType query param required: 'parcel' or 'pet'",
      });
    }

    const booking = await getBooking(bookingId, bookingType);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isUser = booking.user?.toString() === userId.toString();
    const isDriver = booking.driver?.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isUser && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view messages for this booking",
      });
    }

    const mongoose = require("mongoose");
    const messages = await Message.find({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      bookingType,
    })
      .populate("sender", "name email profileImage")
      .populate("receiver", "name email profileImage")
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Get delivery messages error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching messages",
      error: error.message,
    });
  }
};

const markDeliveryMessagesAsRead = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { bookingType } = req.query;
    const userId = req.user._id || req.user.id;

    if (!bookingType) {
      return res.status(400).json({
        success: false,
        message: "bookingType query param required",
      });
    }

    const result = await Message.updateMany(
      { bookingId, bookingType, receiver: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark delivery messages as read error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking messages as read",
    });
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
  sendDeliveryMessage,
  getDeliveryMessages,
  markDeliveryMessagesAsRead,
};
