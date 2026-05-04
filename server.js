const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables FIRST before anything else
dotenv.config({ path: path.resolve(__dirname, ".env") });

const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorMiddlerware");
const swaggerUI = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const { db } = require("./models/rideBooking");
const webhookRoutes = require("./routes/webhook");
const cloudinary = require("cloudinary").v2;

const http = require("http");
const { initSocket } = require("./config/socket");
const { startScheduledRideCron } = require("./services/scheduledRideCron");
const { startAccountDeletionCron } = require("./services/accountDeletionCron");

connectDB();
const app = express();

const server = http.createServer(app);
const io = initSocket(server);

// Start scheduled ride cron job
startScheduledRideCron();

// Start account deletion cron job (runs daily at 2 AM)
startAccountDeletionCron();

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5501",
      "http://localhost:5501",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://www.ridelynk.com",
      "https://ridelynk.com",
      "https://krystal-imaginable-hurtlingly.ngrok-free.dev",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200,
  }),
);
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/ride", require("./routes/rideBookingRoutes"));
app.use("/api/rides", require("./routes/rideBookingRoutes")); // Alias for /api/ride
app.use("/api/rider", require("./routes/riderRoutes"));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));
app.use("/api/parcel", require("./routes/percelBookingRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/pet", require("./routes/petBookingRoutes"));
app.use("/api/webhook", webhookRoutes);
app.use("/api", require("./routes/rideTypesRoutes"));
app.use("/api/chats", require("./routes/chatRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/withdrawal", require("./routes/withdrawalRoutes"));
app.use("/api/referral", require("./routes/referralRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/stripe-connect", require("./routes/stripeConnectRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/promo", require("./routes/promoRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes")); // Notification routes
app.use("/api/instant-payout", require("./routes/instantPayout")); // Instant payout routes
app.use("/api/rides/enhanced", require("./routes/enhancedRideBooking")); // Enhanced ride booking routes
app.use("/api/documents", require("./routes/documentVerification")); // Document verification routes

app.get("/test", (req, res) => {
  res.json({ message: "Backend is alive!" });
});

app.post(
  "/api/webhook/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("Webhook Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log("Payment succeeded:", paymentIntent.id);
        break;
      case "payment_intent.payment_failed":
        const failedIntent = event.data.object;
        console.log("Payment failed:", failedIntent.id);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  },
);

app.get("/api/test-stripe", (req, res) => {
  res.json({
    success: true,
    message: "Stripe is configured",
    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY ? "Present" : "Missing",
  });
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(
  PORT,
  "0.0.0.0",
  () => console.log(`Server running on port ${PORT}`),
  console.log(`✅ Stripe initialized`),
);
