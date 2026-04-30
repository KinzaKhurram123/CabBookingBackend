const express = require("express");
const router = express.Router();
const stripe = require("../config/stripe");
const RideBooking = require("../models/rideBooking");
const parcelBooking = require("../models/parcelBooking");
const petDeliveryBooking = require("../models/petDeliveryBooking");
const Rider = require("../models/riderModel");

router.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      // Use Connect webhook secret if available, fallback to regular webhook secret
      const webhookSecret =
        process.env.STRIPE_CONNECT_WEBHOOK_SECRET ||
        process.env.STRIPE_WEBHOOK_SECRET;

      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("⚠️ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const findBookingByPaymentIntent = async (paymentIntentId) => {
      let booking = await RideBooking.findOne({ paymentIntentId });
      if (booking) return { booking, model: "ride" };

      booking = await parcelBooking.findOne({ paymentIntentId });
      if (booking) return { booking, model: "parcel" };

      booking = await petDeliveryBooking.findOne({ paymentIntentId });
      if (booking) return { booking, model: "pet" };

      return null;
    };

    try {
      switch (event.type) {
        case "payment_intent.amount_capturable_updated":
          const paymentIntent = event.data.object;
          const bookingData = await findBookingByPaymentIntent(
            paymentIntent.id,
          );
          if (bookingData) {
            bookingData.booking.paymentStatus = "authorized";
            await bookingData.booking.save();
            console.log(
              `✅ Payment authorized for ${bookingData.model} booking: ${bookingData.booking._id}`,
            );
          }
          break;

        case "payment_intent.succeeded":
          const succeededIntent = event.data.object;
          const succeededBooking = await findBookingByPaymentIntent(
            succeededIntent.id,
          );
          if (succeededBooking) {
            succeededBooking.booking.paymentStatus = "captured";
            await succeededBooking.booking.save();
            console.log(
              `✅ Payment captured for ${succeededBooking.model} booking: ${succeededBooking.booking._id}`,
            );
          }
          break;

        case "payment_intent.payment_failed":
          const failedIntent = event.data.object;
          const failedBooking = await findBookingByPaymentIntent(
            failedIntent.id,
          );
          if (failedBooking) {
            failedBooking.booking.paymentStatus = "failed";
            failedBooking.booking.status = "cancelled";
            await failedBooking.booking.save();
            console.log(
              `❌ Payment failed for ${failedBooking.model} booking: ${failedBooking.booking._id}`,
            );
          }
          break;

        case "charge.refunded":
          const refund = event.data.object;
          const refundedBooking = await findBookingByPaymentIntent(
            refund.payment_intent,
          );
          if (refundedBooking) {
            refundedBooking.booking.paymentStatus = "refunded";
            await refundedBooking.booking.save();
            console.log(
              `💰 Payment refunded for ${refundedBooking.model} booking: ${refundedBooking.booking._id}`,
            );
          }
          break;

        case "account.updated":
          const account = event.data.object;
          const rider = await Rider.findOne({
            stripeConnectAccountId: account.id,
          });
          if (rider) {
            rider.connectDetailsSubmitted = account.details_submitted;
            rider.connectChargesEnabled = account.charges_enabled;
            rider.connectPayoutsEnabled = account.payouts_enabled;
            rider.connectOnboardingComplete =
              account.details_submitted && account.charges_enabled;
            rider.connectAccountStatus = account.charges_enabled
              ? "enabled"
              : "pending";
            await rider.save();
            console.log(
              `✅ Connect account updated for rider ${rider._id}: status=${rider.connectAccountStatus}`,
            );
          }
          break;

        case "account.application.deauthorized":
          const deauthorizedAccountId = event.account;
          const deauthorizedRider = await Rider.findOne({
            stripeConnectAccountId: deauthorizedAccountId,
          });
          if (deauthorizedRider) {
            deauthorizedRider.connectAccountStatus = "disabled";
            deauthorizedRider.connectChargesEnabled = false;
            deauthorizedRider.connectPayoutsEnabled = false;
            await deauthorizedRider.save();
            console.log(
              `⚠️ Connect account deauthorized for rider ${deauthorizedRider._id}`,
            );
          }
          break;

        case "payout.paid":
          const paidPayout = event.data.object;
          console.log(
            `💵 Payout paid: ${paidPayout.id} - Amount: ${paidPayout.amount / 100} ${paidPayout.currency}`,
          );
          break;

        case "payout.failed":
          const failedPayout = event.data.object;
          console.log(
            `❌ Payout failed: ${failedPayout.id} - ${failedPayout.failure_message}`,
          );
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("❌ Error handling webhook:", error);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  },
);

module.exports = router;
