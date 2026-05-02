const express = require('express');
const router = express.Router();
const stripeConnectController = require('../controllers/stripeConnectController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { riderProtect } = require('../middleware/riderAuthMiddleware');

// Driver routes (require authentication + rider verification)
router.post(
  '/create-account',
  protect,
  riderProtect,
  stripeConnectController.createConnectAccount
);

router.post(
  '/account-link',
  protect,
  riderProtect,
  stripeConnectController.createAccountLink
);

router.get(
  '/account-status',
  protect,
  riderProtect,
  stripeConnectController.getAccountStatus
);

router.post(
  '/refresh-link',
  protect,
  riderProtect,
  stripeConnectController.refreshAccountLink
);

router.get(
  '/dashboard-link',
  protect,
  riderProtect,
  stripeConnectController.getDashboardLink
);

router.post(
  '/disconnect',
  protect,
  riderProtect,
  stripeConnectController.disconnectAccount
);

router.post(
  '/reset',
  protect,
  riderProtect,
  stripeConnectController.resetConnectAccount
);

// OAuth callback routes (public - no authentication required)
router.get('/return', stripeConnectController.handleConnectReturn);
router.get('/refresh', stripeConnectController.handleConnectRefresh);

// Admin routes
const adminController = require('../controllers/adminController');

router.get(
  '/admin/accounts',
  protect,
  authorize('admin'),
  adminController.getDriverConnectAccounts
);

router.get(
  '/admin/account/:riderId',
  protect,
  authorize('admin'),
  adminController.getDriverConnectDetails
);

router.post(
  '/admin/generate-link/:riderId',
  protect,
  authorize('admin'),
  adminController.generateDriverOnboardingLink
);

router.post(
  '/admin/disconnect/:riderId',
  protect,
  authorize('admin'),
  adminController.disconnectDriverAccount
);

module.exports = router;
