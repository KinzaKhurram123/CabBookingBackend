const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorMiddlerware");
const swaggerUI = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const { db } = require("./models/rideBooking");
const webhookRoutes = require("./routes/webhook");

dotenv.config();
connectDB();
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/ride", require("./routes/rideBookingRoutes"));
app.use("/api/rider", require("./routes/riderRoutes"));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));
app.use("/api/parcel", require("./routes/percelBookingRoutes"));
app.use("/api/pet", require("./routes/petBookingRoutes"));
app.use("/api/webhook", webhookRoutes);
app.use("/api", require("./routes/rideTypesRoutes"));

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

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(
  PORT,
  "0.0.0.0",
  () => console.log(`Server running on port ${PORT}`),
  console.log(`✅ Stripe initialized`),
);
