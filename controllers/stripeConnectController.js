const stripe = require('../config/stripe');
const Rider = require('../models/riderModel');

// ─────────────────────────────────────────────
// CREATE CONNECT ACCOUNT
// ─────────────────────────────────────────────
exports.createConnectAccount = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId).populate('user');

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
    }

    if (rider.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Connect account already exists',
        accountId: rider.stripeConnectAccountId
      });
    }

    if (!rider.user || !rider.user.email) {
      return res.status(400).json({
        success: false,
        message: 'User email is required to create Connect account'
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
      error: error.message,
      errorType: error.type,
      errorCode: error.code
    });
  }
};

// ─────────────────────────────────────────────
// CREATE ACCOUNT LINK (Onboarding URL)
// ─────────────────────────────────────────────
exports.createAccountLink = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
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

// ─────────────────────────────────────────────
// GET ACCOUNT STATUS
// ─────────────────────────────────────────────
exports.getAccountStatus = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
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
      error: error.message,
      errorType: error.type,
      errorCode: error.code
    });
  }
};

// ─────────────────────────────────────────────
// REFRESH ACCOUNT LINK
// ─────────────────────────────────────────────
exports.refreshAccountLink = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider || !rider.stripeConnectAccountId) {
      return res.status(404).json({ success: false, message: 'Connect account not found' });
    }

    const backendUrl = process.env.BACKEND_URL || 'https://backend.ridelynk.com';

    const accountLink = await stripe.accountLinks.create({
      account: rider.stripeConnectAccountId,
      refresh_url: `${backendUrl}/api/stripe-connect/refresh`,
      return_url: `${backendUrl}/api/stripe-connect/return`,
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

// ─────────────────────────────────────────────
// GET BALANCE
// ─────────────────────────────────────────────
exports.getBalance = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider || !rider.stripeConnectAccountId) {
      return res.status(404).json({ success: false, message: 'Connect account not found' });
    }

    const balance = await stripe.balance.retrieve({
      stripeAccount: rider.stripeConnectAccountId,
    });

    const available = balance.available.find(b => b.currency === 'usd');
    const pending = balance.pending.find(b => b.currency === 'usd');

    res.status(200).json({
      success: true,
      balance: {
        available: available ? available.amount : 0,
        pending: pending ? pending.amount : 0,
        availableFormatted: `$${((available?.amount || 0) / 100).toFixed(2)}`,
        pendingFormatted: `$${((pending?.amount || 0) / 100).toFixed(2)}`
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve balance',
      error: error.message
    });
  }
};

// ─────────────────────────────────────────────
// INSTANT PAYOUT (~30 min to debit card, ~1% fee)
// Minimum: $60 USD | Fee: MAX($0.50, amount * 1%) | Limit: 3/day
// ─────────────────────────────────────────────
exports.instantPayout = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const { amount } = req.body; // amount in cents, e.g. 6000 = $60.00

    const MIN_AMOUNT_CENTS = 6000; // $60.00

    if (!amount || amount < MIN_AMOUNT_CENTS) {
      return res.status(400).json({
        success: false,
        message: `Minimum instant payout is $60.00. Requested: $${(amount / 100).toFixed(2)}`
      });
    }

    const rider = await Rider.findById(riderId);

    if (!rider || !rider.stripeConnectAccountId) {
      return res.status(404).json({ success: false, message: 'Connect account not found' });
    }

    if (!rider.connectPayoutsEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Payouts not enabled. Complete onboarding first.'
      });
    }

    // Check daily limit (3 instant payouts per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const instantPayoutsToday = rider.instantPayoutsToday || 0;
    const lastPayoutDate = rider.lastInstantPayoutDate;

    const isNewDay = !lastPayoutDate || new Date(lastPayoutDate) < today;
    const dailyCount = isNewDay ? 0 : instantPayoutsToday;

    if (dailyCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Daily instant payout limit reached (3 per day). Try again tomorrow.'
      });
    }

    // Check available balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: rider.stripeConnectAccountId,
    });

    const availableUSD = balance.available.find(b => b.currency === 'usd');
    const availableAmount = availableUSD ? availableUSD.amount : 0;

    if (availableAmount < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${(availableAmount / 100).toFixed(2)}`,
        availableAmount
      });
    }

    // Calculate fee: MAX($0.50, amount * 1%)
    const feeAmount = Math.max(50, Math.round(amount * 0.01)); // in cents

    // Create instant payout
    const payout = await stripe.payouts.create(
      {
        amount,
        currency: 'usd',
        method: 'instant',
        metadata: {
          riderId: riderId.toString(),
          type: 'instant',
          fee: feeAmount.toString()
        }
      },
      { stripeAccount: rider.stripeConnectAccountId }
    );

    // Update daily counter
    rider.instantPayoutsToday = isNewDay ? 1 : dailyCount + 1;
    rider.lastInstantPayoutDate = new Date();
    await rider.save();

    res.status(200).json({
      success: true,
      message: 'Instant payout initiated. Funds arrive within ~30 minutes.',
      payout: {
        id: payout.id,
        amount: payout.amount,
        amountFormatted: `$${(payout.amount / 100).toFixed(2)}`,
        fee: feeAmount,
        feeFormatted: `$${(feeAmount / 100).toFixed(2)}`,
        currency: payout.currency,
        arrivalDate: new Date(payout.arrival_date * 1000),
        status: payout.status,
        method: 'instant',
        dailyPayoutsUsed: rider.instantPayoutsToday,
        dailyPayoutsRemaining: 3 - rider.instantPayoutsToday
      }
    });
  } catch (error) {
    console.error('Instant payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process instant payout',
      error: error.message,
      errorCode: error.code
    });
  }
};

// ─────────────────────────────────────────────
// STANDARD PAYOUT (2-5 business days to bank, no fee)
// ─────────────────────────────────────────────
exports.standardPayout = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const { amount } = req.body; // amount in cents

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payout amount' });
    }

    const rider = await Rider.findById(riderId);

    if (!rider || !rider.stripeConnectAccountId) {
      return res.status(404).json({ success: false, message: 'Connect account not found' });
    }

    if (!rider.connectPayoutsEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Payouts not enabled. Complete onboarding first.'
      });
    }

    // Check available balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: rider.stripeConnectAccountId,
    });

    const availableUSD = balance.available.find(b => b.currency === 'usd');
    const availableAmount = availableUSD ? availableUSD.amount : 0;

    if (availableAmount < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${(availableAmount / 100).toFixed(2)}`,
        availableAmount
      });
    }

    const payout = await stripe.payouts.create(
      {
        amount,
        currency: 'usd',
        method: 'standard',
        metadata: {
          riderId: riderId.toString(),
          type: 'standard'
        }
      },
      { stripeAccount: rider.stripeConnectAccountId }
    );

    res.status(200).json({
      success: true,
      message: 'Standard payout initiated. Funds arrive in 2-5 business days.',
      payout: {
        id: payout.id,
        amount: payout.amount,
        amountFormatted: `$${(payout.amount / 100).toFixed(2)}`,
        fee: 0,
        feeFormatted: '$0.00',
        currency: payout.currency,
        arrivalDate: new Date(payout.arrival_date * 1000),
        status: payout.status,
        method: 'standard'
      }
    });
  } catch (error) {
    console.error('Standard payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process standard payout',
      error: error.message,
      errorCode: error.code
    });
  }
};

// ─────────────────────────────────────────────
// GET DASHBOARD LINK (Stripe Express Dashboard)
// ─────────────────────────────────────────────
exports.getDashboardLink = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider || !rider.stripeConnectAccountId) {
      return res.status(404).json({ success: false, message: 'Connect account not found' });
    }

    const loginLink = await stripe.accounts.createLoginLink(rider.stripeConnectAccountId);

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

// ─────────────────────────────────────────────
// DISCONNECT ACCOUNT
// ─────────────────────────────────────────────
exports.disconnectAccount = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider || !rider.stripeConnectAccountId) {
      return res.status(404).json({ success: false, message: 'Connect account not found' });
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

// ─────────────────────────────────────────────
// RESET CONNECT ACCOUNT (clear stale account ID)
// ─────────────────────────────────────────────
exports.resetConnectAccount = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
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
      message: 'Connect account reset. You can now create a new account.',
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

// ─────────────────────────────────────────────
// ONBOARDING RETURN (success callback page)
// ─────────────────────────────────────────────
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
          .icon { font-size: 64px; margin-bottom: 20px; }
          h1 { color: #333; margin: 0 0 10px 0; font-size: 28px; }
          p { color: #666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; }
          .button {
            background: linear-gradient(135deg, #E2BC3D 0%, #FF8C42 100%);
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
          <div class="icon">✅</div>
          <h1>Setup Complete!</h1>
          <p>Your payment account has been configured. You can close this window and return to the Ridelynk app.</p>
          <button class="button" onclick="window.close()">Close Window</button>
        </div>
        <script>setTimeout(() => window.close(), 5000);</script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Handle connect return error:', error);
    res.status(500).send('An error occurred');
  }
};

// ─────────────────────────────────────────────
// ONBOARDING REFRESH (session expired callback)
// ─────────────────────────────────────────────
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
          .icon { font-size: 64px; margin-bottom: 20px; }
          h1 { color: #333; margin: 0 0 10px 0; font-size: 28px; }
          p { color: #666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; }
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
        <script>setTimeout(() => window.close(), 5000);</script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Handle connect refresh error:', error);
    res.status(500).send('An error occurred');
  }
};

// ─────────────────────────────────────────────
// WEBHOOK — handle Stripe events
// ─────────────────────────────────────────────
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {

      case 'account.updated': {
        const account = event.data.object;
        const riderId = account.metadata?.riderId;
        if (!riderId) break;

        const rider = await Rider.findById(riderId);
        if (!rider) break;

        rider.connectDetailsSubmitted = account.details_submitted;
        rider.connectChargesEnabled = account.charges_enabled;
        rider.connectPayoutsEnabled = account.payouts_enabled;
        rider.connectOnboardingComplete = account.details_submitted && account.charges_enabled;
        rider.connectAccountStatus = account.charges_enabled ? 'enabled' : 'pending';
        await rider.save();

        console.log(`Account updated for rider ${riderId}:`, {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled
        });
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object;
        console.log('Payout paid:', payout.id, '| Amount:', `$${(payout.amount / 100).toFixed(2)}`);
        // TODO: send push notification to driver
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object;
        console.error('Payout failed:', payout.id, '| Reason:', payout.failure_message);
        // TODO: notify driver of failure
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};
