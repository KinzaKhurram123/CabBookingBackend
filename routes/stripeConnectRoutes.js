// const express = require('express');
// const router = express.Router();
// const stripeConnectController = require('../controllers/stripeConnectController');
// const { protect, authorize } = require('../middleware/authMiddleware');
// const { riderProtect } = require('../middleware/riderAuthMiddleware');

// // Driver routes (require authentication + rider verification)
// router.post(
//   '/create-account',
//   protect,
//   riderProtect,
//   stripeConnectController.createConnectAccount
// );

// router.post(
//   '/account-link',
//   protect,
//   riderProtect,
//   stripeConnectController.createAccountLink
// );

// router.get(
//   '/account-status',
//   protect,
//   riderProtect,
//   stripeConnectController.getAccountStatus
// );

// router.post(
//   '/refresh-link',
//   protect,
//   riderProtect,
//   stripeConnectController.refreshAccountLink
// );

// router.get(
//   '/dashboard-link',
//   protect,
//   riderProtect,
//   stripeConnectController.getDashboardLink
// );

// router.post(
//   '/disconnect',
//   protect,
//   riderProtect,
//   stripeConnectController.disconnectAccount
// );

// router.post(
//   '/reset',
//   protect,
//   riderProtect,
//   stripeConnectController.resetConnectAccount
// );

// // OAuth callback routes (public - no authentication required)
// router.get('/return', stripeConnectController.handleConnectReturn);
// router.get('/refresh', stripeConnectController.handleConnectRefresh);

// // Admin routes
// const adminController = require('../controllers/adminController');

// router.get(
//   '/admin/accounts',
//   protect,
//   authorize('admin'),
//   adminController.getDriverConnectAccounts
// );

// router.get(
//   '/admin/account/:riderId',
//   protect,
//   authorize('admin'),
//   adminController.getDriverConnectDetails
// );

// router.post(
//   '/admin/generate-link/:riderId',
//   protect,
//   authorize('admin'),
//   adminController.generateDriverOnboardingLink
// );

// router.post(
//   '/admin/disconnect/:riderId',
//   protect,
//   authorize('admin'),
//   adminController.disconnectDriverAccount
// );

// module.exports = router;

const express = require("express");
const router = express.Router();
const stripeConnect = require("../controllers/stripeConnectController");
const { protect } = require("../middleware/authMiddleware");
const { riderProtect } = require("../middleware/riderAuthMiddleware");

// ═══════════════════════════════════════════════════════════════
// DRIVER ROUTES (Onboarding & Account Management)
// ═══════════════════════════════════════════════════════════════

// Step 1: Create Stripe Express Connect Account
router.post("/create-account", protect, riderProtect, stripeConnect.createConnectAccount);

// Step 2: Get Onboarding Link (KYC)
router.post("/create-link", protect, riderProtect, stripeConnect.createAccountLink);
router.post("/account-link", protect, riderProtect, stripeConnect.createAccountLink); // alias

// Get Account Status
router.get("/status", protect, riderProtect, stripeConnect.getAccountStatus);
router.get("/account-status", protect, riderProtect, stripeConnect.getAccountStatus); // alias

// Refresh Onboarding Link (if expired)
router.post("/refresh-link", protect, riderProtect, stripeConnect.refreshAccountLink);

// Get Stripe Express Dashboard Link
router.get("/dashboard-link", protect, riderProtect, stripeConnect.getDashboardLink);

// Disconnect Account
router.post("/disconnect", protect, riderProtect, stripeConnect.disconnectAccount);

// Reset Account (clear stale account ID)
router.post("/reset", protect, riderProtect, stripeConnect.resetConnectAccount);

// ═══════════════════════════════════════════════════════════════
// PAYOUT ROUTES (Instant & Standard)
// ═══════════════════════════════════════════════════════════════

// Get Available Balance
router.get("/balance", protect, riderProtect, stripeConnect.getBalance);

// Request Instant Payout (~30 min to debit card, ~1% fee)
router.post("/payout/instant", protect, riderProtect, stripeConnect.instantPayout);

// Request Standard Payout (2-5 days to bank, no fee)
router.post("/payout/standard", protect, riderProtect, stripeConnect.standardPayout);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK & CALLBACK ROUTES (Public - No Auth)
// ═══════════════════════════════════════════════════════════════

// Onboarding Success Callback
router.get("/return", stripeConnect.handleConnectReturn);

// Onboarding Refresh Callback (session expired)
router.get("/refresh", stripeConnect.handleConnectRefresh);

// Stripe Webhook (payout.paid, payout.failed, account.updated)
// IMPORTANT: In server.js, this route must use express.raw():
// app.use('/api/stripe-connect/webhook', express.raw({ type: 'application/json' }), stripeConnectRoutes);
router.post("/webhook", stripeConnect.handleWebhook);

module.exports = router;
