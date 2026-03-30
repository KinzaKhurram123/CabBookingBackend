const stripe = require("../config/stripe");
const User = require("../models/user");

exports.setupPaymentMethod = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
          userType: "customer",
        },
      });

      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeCustomerId,
      payment_method_types: ["card"],
    });

    res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      customerId: user.stripeCustomerId,
    });
  } catch (error) {
    console.error("Setup payment method error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getUserCards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.stripeCustomerId) {
      return res.json({
        success: true,
        cards: [],
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    const cards = paymentMethods.data.map((method) => ({
      id: method.id,
      last4: method.card.last4,
      brand: method.card.brand,
      expMonth: method.card.exp_month,
      expYear: method.card.exp_year,
      isDefault: user.defaultPaymentMethod === method.id,
    }));

    res.json({
      success: true,
      cards,
    });
  } catch (error) {
    console.error("Get cards error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.setDefaultCard = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: "User or customer not found",
      });
    }

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    user.defaultPaymentMethod = paymentMethodId;
    await user.save();

    res.json({
      success: true,
      message: "Default card updated successfully",
    });
  } catch (error) {
    console.error("Set default card error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.removeCard = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const user = await User.findById(req.user._id);

    await stripe.paymentMethods.detach(paymentMethodId);

    if (user.defaultPaymentMethod === paymentMethodId) {
      user.defaultPaymentMethod = null;
      await user.save();
    }

    res.json({
      success: true,
      message: "Card removed successfully",
    });
  } catch (error) {
    console.error("Remove card error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const RideBooking = require("../models/rideBooking");

    const booking = await RideBooking.findById(bookingId);
    if (!booking || !booking.paymentIntentId) {
      return res.json({
        success: true,
        hasPayment: false,
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      booking.paymentIntentId,
    );

    res.json({
      success: true,
      paymentStatus: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error("Get payment status error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.chargeCard = async (booking) => {
  try {
    if (booking.paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.capture(
        booking.paymentIntentId,
      );
      return paymentIntent;
    }
    return null;
  } catch (error) {
    console.error("Error charging card:", error);
    throw error;
  }
};
