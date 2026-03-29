const express = require("express");
const router = express.Router();
const stripe = require("../config/stripe");
const RideBooking = require("../models/rideBooking");
const parcelBooking = require("../models/parcelBooking");
const petDeliveryBooking = require("../models/petDeliveryBooking");

router.post(
  "/stripe-webhook",
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
      console.error("Webhook signature verification failed:", err.message);
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

    switch (event.type) {
      case "payment_intent.amount_capturable_updated":
        const paymentIntent = event.data.object;
        const bookingData = await findBookingByPaymentIntent(paymentIntent.id);

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
        const failedBooking = await findBookingByPaymentIntent(failedIntent.id);

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
    }

    res.json({ received: true });
  },
);

module.exports = router;
