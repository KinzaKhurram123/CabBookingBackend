const stripe = require('../config/stripe');
const Rider = require('../models/riderModel');
const User = require('../models/user');

// Create Stripe Connect Express account for driver
exports.createConnectAccount = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId).populate('user');

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider profile not found'
      });
    }

    if (rider.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Connect account already exists',
        accountId: rider.stripeConnectAccountId
      });
    }

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: rider.user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        riderId: rider._id.toString(),
        userId: rider.user._id.toString()
      }
    });

    rider.stripeConnectAccountId = account.id;
    rider.connectAccountStatus = 'pending';
    rider.connectAccountCreatedAt = new Date();
    await rider.save();

    res.status(201).json({
      success: true,
      message: 'Connect account created successfully',
      accountId: account.id
    });
  } catch (error) {
    console.error('Create Connect account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Connect account',
      error: error.message
    });
  }
};

// Generate onboarding link for driver
exports.createAccountLink = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider profile not found'
      });
    }

    if (!rider.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        message: 'No Connect account found. Please create one first.'
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: rider.stripeConnectAccountId,
      refresh_url: process.env.CONNECT_REFRESH_URL,
      return_url: process.env.CONNECT_RETURN_URL,
      type: 'account_onboarding',
    });

    res.status(200).json({
      success: true,
      message: 'Onboarding link generated',
      url: accountLink.url
    });
  } catch (error) {
    console.error('Create account link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate onboarding link',
      error: error.message
    });
  }
};

// Get Connect account status
exports.getAccountStatus = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider profile not found'
      });
    }

    if (!rider.stripeConnectAccountId) {
      return res.status(200).json({
        success: true,
        message: 'No Connect account found',
        status: 'not_started',
        accountStatus: null
      });
    }

    const account = await stripe.accounts.retrieve(rider.stripeConnectAccountId);

    rider.connectDetailsSubmitted = account.details_submitted;
    rider.connectChargesEnabled = account.charges_enabled;
    rider.connectPayoutsEnabled = account.payouts_enabled;
    rider.connectOnboardingComplete = account.details_submitted && account.charges_enabled;
    rider.connectAccountStatus = account.charges_enabled ? 'enabled' : 'pending';
    await rider.save();

    res.status(200).json({
      success: true,
      message: 'Account status retrieved',
      status: rider.connectAccountStatus,
      accountStatus: {
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        onboardingComplete: rider.connectOnboardingComplete,
        requirementsCurrentlyDue: account.requirements?.currently_due || [],
        requirementsEventuallyDue: account.requirements?.eventually_due || []
      }
    });
  } catch (error) {
    console.error('Get account status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve account status',
      error: error.message
    });
  }
};

// Refresh account link (when expired)
exports.refreshAccountLink = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider || !rider.stripeConnectAccountId) {
      return res.status(404).json({
        success: false,
        message: 'Connect account not found'
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: rider.stripeConnectAccountId,
      refresh_url: process.env.CONNECT_REFRESH_URL,
      return_url: process.env.CONNECT_RETURN_URL,
      type: 'account_onboarding',
    });

    res.status(200).json({
      success: true,
      message: 'Onboarding link refreshed',
      url: accountLink.url
    });
  } catch (error) {
    console.error('Refresh account link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh onboarding link',
      error: error.message
    });
  }
};

// Handle OAuth return after onboarding
exports.handleConnectReturn = async (req, res) => {
  try {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Onboarding Complete</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
          .message { color: #333; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="success">✓ Onboarding Complete!</div>
        <div class="message">Your payment account has been set up successfully. You can now close this window and return to the app.</div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Handle connect return error:', error);
    res.status(500).send('An error occurred');
  }
};

// Handle OAuth refresh
exports.handleConnectRefresh = async (req, res) => {
  try {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Onboarding Incomplete</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .warning { color: #ffc107; font-size: 24px; margin-bottom: 20px; }
          .message { color: #333; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="warning">⚠ Onboarding Incomplete</div>
        <div class="message">Please return to the app and complete your payment account setup.</div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Handle connect refresh error:', error);
    res.status(500).send('An error occurred');
  }
};

// Disconnect Connect account
exports.disconnectAccount = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider || !rider.stripeConnectAccountId) {
      return res.status(404).json({
        success: false,
        message: 'Connect account not found'
      });
    }

    rider.connectAccountStatus = 'disabled';
    rider.connectChargesEnabled = false;
    rider.connectPayoutsEnabled = false;
    await rider.save();

    res.status(200).json({
      success: true,
      message: 'Connect account disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect account',
      error: error.message
    });
  }
};

// Get Stripe Express Dashboard login link
exports.getDashboardLink = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider || !rider.stripeConnectAccountId) {
      return res.status(404).json({
        success: false,
        message: 'Connect account not found'
      });
    }

    const loginLink = await stripe.accounts.createLoginLink(
      rider.stripeConnectAccountId
    );

    res.status(200).json({
      success: true,
      message: 'Dashboard link generated',
      url: loginLink.url
    });
  } catch (error) {
    console.error('Get dashboard link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate dashboard link',
      error: error.message
    });
  }
};
