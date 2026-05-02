const stripe = require('../config/stripe');
const Rider = require('../models/riderModel');
const User = require('../models/user');

exports.createConnectAccount = async (req, res) => {
  try {
    console.log('Creating Stripe Connect account for rider:', req.rider._id);
    
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId).populate('user');

    if (!rider) {
      console.log('Rider not found:', riderId);
      return res.status(404).json({
        success: false,
        message: 'Rider profile not found'
      });
    }

    console.log('Rider found:', {
      riderId: rider._id,
      userId: rider.user?._id,
      email: rider.user?.email,
      existingAccountId: rider.stripeConnectAccountId
    });

    if (rider.stripeConnectAccountId) {
      console.log('Connect account already exists:', rider.stripeConnectAccountId);
      return res.status(400).json({
        success: false,
        message: 'Connect account already exists',
        accountId: rider.stripeConnectAccountId
      });
    }

    if (!rider.user || !rider.user.email) {
      console.log('User or email not found for rider');
      return res.status(400).json({
        success: false,
        message: 'User email is required to create Connect account'
      });
    }

    console.log('Creating Stripe account with email:', rider.user.email);

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

    console.log('Stripe account created successfully:', account.id);

    rider.stripeConnectAccountId = account.id;
    rider.connectAccountStatus = 'pending';
    rider.connectAccountCreatedAt = new Date();
    await rider.save();

    console.log('Rider updated with Stripe account ID');

    res.status(201).json({
      success: true,
      message: 'Connect account created successfully',
      accountId: account.id
    });
  } catch (error) {
    console.error('Create Connect account error:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      raw: error.raw
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create Connect account',
      error: error.message,
      errorType: error.type,
      errorCode: error.code
    });
  }
};

exports.createAccountLink = async (req, res) => {
  try {
    console.log('Creating account link for rider:', req.rider._id);
    
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

    const backendUrl = process.env.BACKEND_URL || 'https://backend.ridelynk.com';
    
    const accountLink = await stripe.accountLinks.create({
      account: rider.stripeConnectAccountId,
      refresh_url: `${backendUrl}/api/stripe-connect/refresh`,
      return_url: `${backendUrl}/api/stripe-connect/return`,
      type: 'account_onboarding',
    });

    console.log('Account link created successfully');

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
exports.getAccountStatus = async (req, res) => {
  try {
    console.log('Getting account status for rider:', req.rider._id);
    
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider) {
      console.log('Rider not found:', riderId);
      return res.status(404).json({
        success: false,
        message: 'Rider profile not found'
      });
    }

    console.log('Rider found, Stripe account ID:', rider.stripeConnectAccountId);

    if (!rider.stripeConnectAccountId) {
      console.log('No Stripe Connect account found for rider');
      return res.status(200).json({
        success: true,
        message: 'No Connect account found',
        status: 'not_started',
        accountStatus: null
      });
    }

    console.log('Retrieving Stripe account details from Stripe API');
    const account = await stripe.accounts.retrieve(rider.stripeConnectAccountId);

    console.log('Stripe account retrieved:', {
      id: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    });

    rider.connectDetailsSubmitted = account.details_submitted;
    rider.connectChargesEnabled = account.charges_enabled;
    rider.connectPayoutsEnabled = account.payouts_enabled;
    rider.connectOnboardingComplete = account.details_submitted && account.charges_enabled;
    rider.connectAccountStatus = account.charges_enabled ? 'enabled' : 'pending';
    await rider.save();

    console.log('Rider status updated successfully');

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
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve account status',
      error: error.message,
      errorType: error.type,
      errorCode: error.code
    });
  }
};

exports.refreshAccountLink = async (req, res) => {
  try {
    console.log('Refreshing account link for rider:', req.rider._id);
    
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider || !rider.stripeConnectAccountId) {
      return res.status(404).json({
        success: false,
        message: 'Connect account not found'
      });
    }

    const backendUrl = process.env.BACKEND_URL || 'https://backend.ridelynk.com';

    const accountLink = await stripe.accountLinks.create({
      account: rider.stripeConnectAccountId,
      refresh_url: `${backendUrl}/api/stripe-connect/refresh`,
      return_url: `${backendUrl}/api/stripe-connect/return`,
      type: 'account_onboarding',
    });

    console.log('Account link refreshed successfully');

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

exports.handleConnectReturn = async (req, res) => {
  try {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Setup Complete - Ridelynk</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #E2BC3D 0%, #FF8C42 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
          }
          .icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          p {
            color: #666;
            margin: 0 0 20px 0;
            font-size: 16px;
            line-height: 1.5;
          }
          .button {
            background: linear-gradient(135deg, #E2BC3D 0%, #FF8C42 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✅</div>
          <h1>Setup Complete!</h1>
          <p>Your payment account has been successfully configured. You can now close this window and return to the Ridelynk app.</p>
          <button class="button" onclick="window.close()">Close Window</button>
        </div>
        <script>
          setTimeout(() => {
            window.close();
          }, 5000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Handle connect return error:', error);
    res.status(500).send('An error occurred');
  }
};

exports.handleConnectRefresh = async (req, res) => {
  try {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Session Expired - Ridelynk</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
          }
          .icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          p {
            color: #666;
            margin: 0 0 20px 0;
            font-size: 16px;
            line-height: 1.5;
          }
          .button {
            background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⏱️</div>
          <h1>Session Expired</h1>
          <p>Your onboarding session has expired. Please return to the Ridelynk app and try again.</p>
          <button class="button" onclick="window.close()">Close Window</button>
        </div>
        <script>
          setTimeout(() => {
            window.close();
          }, 5000);
        </script>
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

exports.resetConnectAccount = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider profile not found'
      });
    }

    const oldAccountId = rider.stripeConnectAccountId;

    rider.stripeConnectAccountId = null;
    rider.connectAccountStatus = null;
    rider.connectChargesEnabled = false;
    rider.connectPayoutsEnabled = false;
    rider.connectOnboardingComplete = false;
    rider.connectDetailsSubmitted = false;
    await rider.save();

    res.status(200).json({
      success: true,
      message: 'Connect account reset successfully. You can now create a new account.',
      clearedAccountId: oldAccountId
    });
  } catch (error) {
    console.error('Reset connect account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset Connect account',
      error: error.message
    });
  }
};

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
