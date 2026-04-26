const stripe = require("../config/stripe");
const User = require("../models/user");

exports.setupPaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Create Stripe customer if not exists
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString(), userType: "customer" },
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    // If paymentMethodId provided — attach directly to customer
    if (paymentMethodId) {
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: user.stripeCustomerId,
        });
      } catch (attachError) {
        if (!attachError.message.includes("already been attached")) {
          throw attachError;
        }
      }

      // Set as default if no default exists
      if (!user.defaultPaymentMethod) {
        await stripe.customers.update(user.stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
        user.defaultPaymentMethod = paymentMethodId;
        await user.save();
      }

      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      return res.status(200).json({
        success: true,
        message: "Card saved successfully",
        card: {
          id: pm.id,
          last4: pm.card.last4,
          brand: pm.card.brand,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
          isDefault: user.defaultPaymentMethod === pm.id,
        },
      });
    }

    // No paymentMethodId — return SetupIntent clientSecret
    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeCustomerId,
      payment_method_types: ["card"],
    });

    res.status(200).json({
      success: true,
      message: "Setup intent created successfully",
      clientSecret: setupIntent.client_secret,
      customerId: user.stripeCustomerId,
    });
  } catch (error) {
    console.error("Setup payment method error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to setup payment method",
      error: error.message,
    });
  }
};

exports.confirmPaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId, setAsDefault } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ success: false, message: "paymentMethodId is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });
    } catch (attachError) {
      if (!attachError.message.includes("already been attached")) throw attachError;
    }

    const existingMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    if (setAsDefault || existingMethods.data.length === 1) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      user.defaultPaymentMethod = paymentMethodId;
      await user.save();
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    res.status(200).json({
      success: true,
      message: "Card saved successfully",
      card: {
        id: paymentMethod.id,
        last4: paymentMethod.card.last4,
        brand: paymentMethod.card.brand,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
        isDefault: user.defaultPaymentMethod === paymentMethod.id,
      },
    });
  } catch (error) {
    console.error("Confirm payment method error:", error);
    res.status(500).json({ success: false, message: "Failed to save card", error: error.message });
  }
};

exports.getUserCards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found", cards: [] });
    }

    if (!user.stripeCustomerId) {
      return res.status(200).json({ success: true, message: "No payment methods saved yet", cards: [] });
    }

    let paymentMethods;
    try {
      paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: "card",
      });
    } catch (stripeError) {
      // Customer doesn't exist in this Stripe account — clear it and return empty
      if (stripeError.code === 'resource_missing') {
        await User.findByIdAndUpdate(req.user._id, {
          $unset: { stripeCustomerId: '', defaultPaymentMethod: '' }
        });
        return res.status(200).json({ success: true, message: "No payment methods saved yet", cards: [] });
      }
      throw stripeError;
    }

    const cards = paymentMethods.data.map((method) => ({
      id: method.id,
      last4: method.card.last4,
      brand: method.card.brand,
      expMonth: method.card.exp_month,
      expYear: method.card.exp_year,
      isDefault: user.defaultPaymentMethod === method.id,
    }));

    res.status(200).json({ success: true, message: "Cards fetched successfully", total: cards.length, cards });
  } catch (error) {
    console.error("Get cards error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch cards", error: error.message });
  }
};

exports.setDefaultCard = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ success: false, message: "User or customer not found" });
    }

    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    user.defaultPaymentMethod = paymentMethodId;
    await user.save();

    res.status(200).json({ success: true, message: "Default card updated successfully" });
  } catch (error) {
    console.error("Set default card error:", error);
    res.status(500).json({ success: false, message: "Failed to set default card", error: error.message });
  }
};

exports.removeCard = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const user = await User.findById(req.user._id);

    await stripe.paymentMethods.detach(paymentMethodId);

    if (user && user.defaultPaymentMethod === paymentMethodId) {
      user.defaultPaymentMethod = null;
      await user.save();
    }

    res.status(200).json({ success: true, message: "Card removed successfully" });
  } catch (error) {
    console.error("Remove card error:", error);
    res.status(500).json({ success: false, message: "Failed to remove card", error: error.message });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const RideBooking = require("../models/rideBooking");

    const booking = await RideBooking.findById(bookingId);
    if (!booking || !booking.paymentIntentId) {
      return res.json({ success: true, hasPayment: false, message: "No payment found for this booking" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(booking.paymentIntentId);

    res.status(200).json({
      success: true,
      paymentStatus: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error("Get payment status error:", error);
    res.status(500).json({ success: false, message: "Failed to get payment status", error: error.message });
  }
};

exports.chargeCard = async (booking) => {
  try {
    if (booking.paymentIntentId) {
      return await stripe.paymentIntents.capture(booking.paymentIntentId);
    }
    return null;
  } catch (error) {
    console.error("Error charging card:", error);
    throw error;
  }
};

exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = "usd", bookingData } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: "Amount is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Create Stripe customer if not exists
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const paymentIntentData = {
      amount: Math.round(amount),
      currency,
      customer: user.stripeCustomerId,
      payment_method_types: ["card"],
      metadata: { userId: user._id.toString() },
      confirm: false, // Let frontend confirm
    };

    if (user.defaultPaymentMethod) {
      paymentIntentData.payment_method = user.defaultPaymentMethod;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    res.status(200).json({
      success: true,
      message: "Payment intent created",
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Create payment intent error:", error);
    res.status(500).json({ success: false, message: "Failed to create payment intent", error: error.message });
  }
};

exports.confirmPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: "paymentIntentId is required" });
    }

    // First retrieve the current status
    const existing = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Already succeeded — just return success
    if (existing.status === "succeeded") {
      return res.status(200).json({
        success: true,
        message: "Payment already confirmed",
        status: existing.status,
        paymentIntentId: existing.id,
      });
    }

    // Already cancelled
    if (existing.status === "canceled") {
      return res.status(400).json({
        success: false,
        message: "Payment was cancelled",
        status: existing.status,
      });
    }

    // Confirm if still requires confirmation
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      ...(paymentMethodId && { payment_method: paymentMethodId }),
    });

    res.status(200).json({
      success: true,
      message: "Payment confirmed",
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Confirm payment intent error:", error);
    res.status(500).json({ success: false, message: "Failed to confirm payment", error: error.message });
  }
};
