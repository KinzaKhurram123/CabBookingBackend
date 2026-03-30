const { Server } = require("socket.io");
const RideBooking = require("../models/rideBooking");
const Rider = require("../models/riderModel");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    });

    socket.on("updateLocation", async (data) => {
      const { bookingId, latitude, longitude } = data;
      console.log(`Location update for booking ${bookingId}:`, {
        latitude,
        longitude,
      });

      try {
        const booking = await RideBooking.findById(bookingId).populate("user");
        if (booking) {
          const rider = await Rider.findOneAndUpdate(
            { _id: booking.driver },
            {
              location: {
                type: "Point",
                coordinates: [longitude, latitude],
              },
            },
            { new: true },
          );

          if (booking.user) {
            io.to(booking.user._id.toString()).emit("locationUpdate", {
              bookingId,
              latitude,
              longitude,
            });
          }
        }
      } catch (error) {
        console.error("Error updating location:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initSocket, getIO };
