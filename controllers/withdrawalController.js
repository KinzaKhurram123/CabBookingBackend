const Rider = require("../models/riderModel");
const Withdrawal = require("../models/withdrawal");
const mongoose = require("mongoose");

// Constants for withdrawal limits
const MINIMUM_WITHDRAWAL = 100;
const MAX_WITHDRAWAL_PER_REQUEST = 10000;
const MAX_WITHDRAWAL_PER_DAY = 50000;

// Helper function to check daily withdrawal limit
const checkDailyLimit = async (riderId, amount) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayWithdrawals = await Withdrawal.aggregate([
    {
      $match: {
        rider: riderId,
        createdAt: { $gte: startOfDay },
        status: { $in: ["pending", "approved"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const dailyTotal = todayWithdrawals[0]?.total || 0;
  return { dailyTotal, remaining: MAX_WITHDRAWAL_PER_DAY - dailyTotal };
};

// ==================== USER CONTROLLERS ====================

exports.getWallet = async (req, res) => {
  try {
    const rider = await Rider.findOne({ user: req.user._id }).select(
      "walletBalance totalEarning totalWithdrawn pendingEarnings bankAccount totalRides stripeConnectAccountId connectAccountStatus connectChargesEnabled connectPayoutsEnabled connectOnboardingComplete",
    );

    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    // Pending withdrawals amount
    const pendingWithdrawals = await Withdrawal.aggregate([
      { $match: { rider: rider._id, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingAmount = pendingWithdrawals[0]?.total || 0;

    const response = {
      success: true,
      wallet: {
        balance: rider.walletBalance,
        totalEarning: rider.totalEarning,
        totalWithdrawn: rider.totalWithdrawn,
        pendingWithdrawal: pendingAmount,
        totalRides: rider.totalRides,
      },
      stripeConnect: {
        enabled: rider.connectChargesEnabled || false,
        accountId: rider.stripeConnectAccountId || null,
        status: rider.connectAccountStatus || "not_started",
        onboardingComplete: rider.connectOnboardingComplete || false,
        payoutsEnabled: rider.connectPayoutsEnabled || false,
        chargesEnabled: rider.connectChargesEnabled || false,
      },
      withdrawalLimits: {
        minimum: MINIMUM_WITHDRAWAL,
        maximumPerRequest: MAX_WITHDRAWAL_PER_REQUEST,
        maximumPerDay: MAX_WITHDRAWAL_PER_DAY,
      },
      paymentMethod: rider.connectChargesEnabled ? "stripe_connect" : "manual",
      message: rider.connectChargesEnabled
        ? "Earnings are automatically paid out via Stripe Connect"
        : "Please complete Stripe Connect onboarding to receive automatic payouts",
    };

    // Include legacy bank account if exists
    if (rider.bankAccount && rider.bankAccount.accountNumber) {
      response.wallet.legacyBankAccount = rider.bankAccount;
    }

    res.json(response);
  } catch (error) {
    console.error("Get wallet error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.requestWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, bankAccount } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid withdrawal amount is required",
      });
    }

    const rider = await Rider.findOne({ user: req.user._id }).session(session);
    if (!rider) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    // Check minimum amount
    if (amount < MINIMUM_WITHDRAWAL) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal amount is ${MINIMUM_WITHDRAWAL}`,
        minimumAmount: MINIMUM_WITHDRAWAL,
      });
    }

    // Check maximum per request
    if (amount > MAX_WITHDRAWAL_PER_REQUEST) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Maximum withdrawal per request is ${MAX_WITHDRAWAL_PER_REQUEST}`,
        maximumAmount: MAX_WITHDRAWAL_PER_REQUEST,
      });
    }

    // Check wallet balance
    if (rider.walletBalance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Available: ${rider.walletBalance}`,
        availableBalance: rider.walletBalance,
      });
    }

    // Check daily limit
    const { dailyTotal, remaining } = await checkDailyLimit(rider._id, amount);
    if (dailyTotal + amount > MAX_WITHDRAWAL_PER_DAY) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Daily withdrawal limit exceeded. Remaining today: ${remaining}`,
        dailyLimit: MAX_WITHDRAWAL_PER_DAY,
        remainingToday: remaining,
        requestedAmount: amount,
      });
    }

    // Handle Stripe Connect users
    if (rider.stripeConnectAccountId && rider.connectChargesEnabled) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message:
          "Manual withdrawals are no longer available. Your earnings are automatically paid out via Stripe Connect.",
        stripeConnect: {
          accountId: rider.stripeConnectAccountId,
          status: rider.connectAccountStatus,
          payoutsEnabled: rider.connectPayoutsEnabled,
          chargesEnabled: rider.connectChargesEnabled,
          onboardingComplete: rider.connectOnboardingComplete,
          info: "Payments are automatically transferred to your bank account based on your payout schedule.",
          supportContact: "support@yourapp.com",
        },
      });
    }

    // Manual withdrawal flow
    const bank = bankAccount || rider.bankAccount;
    if (!bank || !bank.accountNumber || !bank.bankName) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message:
          "Bank account details required. Please add bank account first.",
        requiresBankAccount: true,
      });
    }

    // Check for existing pending withdrawal
    const existingPending = await Withdrawal.findOne({
      rider: rider._id,
      status: "pending",
    }).session(session);

    if (existingPending) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message:
          "You already have a pending withdrawal request. Please wait for it to be processed.",
        pendingWithdrawalId: existingPending._id,
      });
    }

    // Save bank account if new one provided
    if (
      bankAccount &&
      (!rider.bankAccount || Object.keys(rider.bankAccount).length === 0)
    ) {
      rider.bankAccount = bankAccount;
      await rider.save({ session });
    }

    // Create withdrawal request
    const withdrawal = await Withdrawal.create(
      [
        {
          rider: rider._id,
          amount,
          status: "pending",
          bankAccount: bank,
          requestedAt: new Date(),
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      withdrawal: {
        id: withdrawal[0]._id,
        amount: withdrawal[0].amount,
        status: withdrawal[0].status,
        bankAccount: withdrawal[0].bankAccount,
        createdAt: withdrawal[0].createdAt,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Request withdrawal error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getWithdrawalHistory = async (req, res) => {
  try {
    const rider = await Rider.findOne({ user: req.user._id });
    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    const { page = 1, limit = 20, status } = req.query;
    const filter = { rider: rider._id };
    if (status) filter.status = status;

    const withdrawals = await Withdrawal.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Withdrawal.countDocuments(filter);

    // Calculate summary statistics
    const summary = await Withdrawal.aggregate([
      { $match: { rider: rider._id } },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      count: withdrawals.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      withdrawals,
      summary: {
        pending: summary.find((s) => s._id === "pending")?.total || 0,
        approved: summary.find((s) => s._id === "approved")?.total || 0,
        paid: summary.find((s) => s._id === "paid")?.total || 0,
        rejected: summary.find((s) => s._id === "rejected")?.total || 0,
      },
    });
  } catch (error) {
    console.error("Get withdrawal history error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.updateBankAccount = async (req, res) => {
  try {
    const { accountTitle, accountNumber, bankName, branchCode, iban } =
      req.body;

    if (!accountTitle || !accountNumber || !bankName) {
      return res.status(400).json({
        success: false,
        message: "accountTitle, accountNumber, and bankName are required",
      });
    }

    // Validate account number format
    if (accountNumber.length < 5 || accountNumber.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Account number must be between 5 and 20 characters",
      });
    }

    const rider = await Rider.findOneAndUpdate(
      { user: req.user._id },
      {
        bankAccount: {
          accountTitle,
          accountNumber,
          bankName,
          branchCode: branchCode || "",
          iban: iban || "",
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true },
    ).select("bankAccount");

    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    res.json({
      success: true,
      message: "Bank account updated successfully",
      bankAccount: rider.bankAccount,
    });
  } catch (error) {
    console.error("Update bank account error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ==================== ADMIN CONTROLLERS ====================

exports.adminGetWithdrawals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate,
    } = req.query;
    const filter = {};

    if (status) filter.status = status;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search by rider name or phone
    if (search) {
      const riders = await Rider.find({
        $or: [
          { "user.name": { $regex: search, $options: "i" } },
          { "user.phone": { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      filter.rider = { $in: riders.map((r) => r._id) };
    }

    const withdrawals = await Withdrawal.find(filter)
      .populate({
        path: "rider",
        select: "bankAccount totalEarning walletBalance",
        populate: { path: "user", select: "name email phone profileImage" },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Withdrawal.countDocuments(filter);

    // Get summary statistics
    const summary = await Withdrawal.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalPendingAmount =
      summary.find((s) => s._id === "pending")?.totalAmount || 0;

    res.json({
      success: true,
      count: withdrawals.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      withdrawals,
      summary: {
        pending: summary.find((s) => s._id === "pending")?.count || 0,
        approved: summary.find((s) => s._id === "approved")?.count || 0,
        paid: summary.find((s) => s._id === "paid")?.count || 0,
        rejected: summary.find((s) => s._id === "rejected")?.count || 0,
        totalPendingAmount,
      },
    });
  } catch (error) {
    console.error("Admin get withdrawals error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.adminApproveWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { withdrawalId } = req.params;
    const { note } = req.body;

    const withdrawal = await Withdrawal.findById(withdrawalId)
      .populate("rider")
      .session(session);

    if (!withdrawal) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "pending") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Cannot approve. Current status: ${withdrawal.status}`,
      });
    }

    // Check if rider has Stripe Connect (should not have manual withdrawals)
    if (
      withdrawal.rider.stripeConnectAccountId &&
      withdrawal.rider.connectChargesEnabled
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message:
          "This rider uses Stripe Connect. Manual withdrawals are not allowed.",
      });
    }

    // Deduct from wallet with race condition protection
    const rider = await Rider.findById(withdrawal.rider._id).session(session);
    if (rider.walletBalance < withdrawal.amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Rider has insufficient wallet balance. Available: ${rider.walletBalance}, Requested: ${withdrawal.amount}`,
      });
    }

    const updatedRider = await Rider.findByIdAndUpdate(
      withdrawal.rider._id,
      {
        $inc: {
          walletBalance: -withdrawal.amount,
          totalWithdrawn: withdrawal.amount,
        },
      },
      { session, new: true },
    );

    withdrawal.status = "approved";
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    withdrawal.note = note || null;
    await withdrawal.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Withdrawal approved successfully",
      withdrawal: {
        id: withdrawal._id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        processedAt: withdrawal.processedAt,
        note: withdrawal.note,
      },
      riderBalance: updatedRider.walletBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Admin approve withdrawal error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.adminRejectWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { withdrawalId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Rejection reason is required" });
    }

    const withdrawal = await Withdrawal.findById(withdrawalId).session(session);
    if (!withdrawal) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "pending") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Cannot reject. Current status: ${withdrawal.status}`,
      });
    }

    withdrawal.status = "rejected";
    withdrawal.rejectionReason = rejectionReason;
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    await withdrawal.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Withdrawal rejected",
      withdrawal: {
        id: withdrawal._id,
        status: withdrawal.status,
        rejectionReason: withdrawal.rejectionReason,
        processedAt: withdrawal.processedAt,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Admin reject withdrawal error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.adminMarkAsPaid = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { note, transactionId } = req.body;

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return res
        .status(404)
        .json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as paid. Must be approved first. Current: ${withdrawal.status}`,
      });
    }

    withdrawal.status = "paid";
    withdrawal.processedAt = new Date();
    withdrawal.note = note || withdrawal.note;
    withdrawal.transactionId = transactionId || null;
    withdrawal.paidAt = new Date();
    await withdrawal.save();

    res.json({
      success: true,
      message: "Withdrawal marked as paid",
      withdrawal: {
        id: withdrawal._id,
        status: withdrawal.status,
        paidAt: withdrawal.paidAt,
        transactionId: withdrawal.transactionId,
        note: withdrawal.note,
      },
    });
  } catch (error) {
    console.error("Admin mark as paid error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Bulk approve withdrawals
exports.adminBulkApproveWithdrawals = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { withdrawalIds } = req.body;

    if (!withdrawalIds || !withdrawalIds.length) {
      return res.status(400).json({
        success: false,
        message: "No withdrawal IDs provided",
      });
    }

    const withdrawals = await Withdrawal.find({
      _id: { $in: withdrawalIds },
      status: "pending",
    })
      .populate("rider")
      .session(session);

    const results = {
      approved: [],
      failed: [],
    };

    for (const withdrawal of withdrawals) {
      try {
        const rider = await Rider.findById(withdrawal.rider._id).session(
          session,
        );

        if (rider.walletBalance >= withdrawal.amount) {
          await Rider.findByIdAndUpdate(
            withdrawal.rider._id,
            {
              $inc: {
                walletBalance: -withdrawal.amount,
                totalWithdrawn: withdrawal.amount,
              },
            },
            { session },
          );

          withdrawal.status = "approved";
          withdrawal.processedAt = new Date();
          withdrawal.processedBy = req.user._id;
          await withdrawal.save({ session });

          results.approved.push({
            id: withdrawal._id,
            amount: withdrawal.amount,
            rider: withdrawal.rider._id,
          });
        } else {
          results.failed.push({
            id: withdrawal._id,
            reason: "Insufficient balance",
            requested: withdrawal.amount,
            available: rider.walletBalance,
          });
        }
      } catch (error) {
        results.failed.push({
          id: withdrawal._id,
          reason: error.message,
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Approved ${results.approved.length} withdrawals, failed ${results.failed.length}`,
      results,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Bulk approve withdrawals error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==================== USER (CUSTOMER) WITHDRAWAL CONTROLLERS ====================

exports.getUserWallet = async (req, res) => {
  try {
    const user = await require("../models/user")
      .findById(req.user._id)
      .select("walletBalance totalEarnedFromReferrals");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Pending withdrawals amount for this user
    const pendingWithdrawals = await Withdrawal.aggregate([
      { $match: { userId: user._id, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingAmount = pendingWithdrawals[0]?.total || 0;

    res.status(200).json({
      success: true,
      wallet: {
        balance: user.walletBalance,
        totalEarned: user.totalEarnedFromReferrals,
        pendingWithdrawal: pendingAmount,
      },
      withdrawalLimits: {
        minimum: MINIMUM_WITHDRAWAL,
        maximumPerRequest: MAX_WITHDRAWAL_PER_REQUEST,
        maximumPerDay: MAX_WITHDRAWAL_PER_DAY,
      },
    });
  } catch (error) {
    console.error("Get user wallet error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.requestUserWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, paymentMethodId, bankAccount } = req.body;
    const User = require("../models/user");

    console.log("Request body:", req.body);
    console.log("Amount:", amount, "BankAccount:", bankAccount);

    if (!amount || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Valid withdrawal amount is required",
      });
    }

    const user = await User.findById(req.user._id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    console.log("User wallet balance:", user.walletBalance, "Requested amount:", amount);

    // Check minimum amount
    if (amount < MINIMUM_WITHDRAWAL) {
      console.log("FAILED: Amount below minimum");
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal amount is ${MINIMUM_WITHDRAWAL}`,
        minimumAmount: MINIMUM_WITHDRAWAL,
      });
    }

    // Check maximum per request
    if (amount > MAX_WITHDRAWAL_PER_REQUEST) {
      console.log("FAILED: Amount above maximum");
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Maximum withdrawal per request is ${MAX_WITHDRAWAL_PER_REQUEST}`,
        maximumAmount: MAX_WITHDRAWAL_PER_REQUEST,
      });
    }

    // Check wallet balance
    if (user.walletBalance < amount) {
      console.log("FAILED: Insufficient balance");
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Available: ${user.walletBalance}`,
        availableBalance: user.walletBalance,
      });
    }

    // Check daily limit
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayWithdrawals = await Withdrawal.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: startOfDay },
          status: { $in: ["pending", "approved"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const dailyTotal = todayWithdrawals[0]?.total || 0;
    const remaining = MAX_WITHDRAWAL_PER_DAY - dailyTotal;

    console.log("Daily total:", dailyTotal, "Remaining:", remaining);

    if (dailyTotal + amount > MAX_WITHDRAWAL_PER_DAY) {
      console.log("FAILED: Daily limit exceeded");
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Daily withdrawal limit exceeded. Remaining today: ${remaining}`,
        dailyLimit: MAX_WITHDRAWAL_PER_DAY,
        remainingToday: remaining,
        requestedAmount: amount,
      });
    }

    // Validate payment method - bankAccount can be string (payment method ID) or object (bank details)
    if (!bankAccount && !paymentMethodId) {
      console.log("FAILED: No payment method provided");
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Payment method (card ID or bank account) is required",
        requiresPaymentMethod: true,
      });
    }

    console.log("All validations passed, checking for pending withdrawal");

    // Check for existing pending withdrawal
    const existingPending = await Withdrawal.findOne({
      userId: user._id,
      status: "pending",
    }).session(session);

    console.log("Existing pending withdrawal:", existingPending);

    if (existingPending) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message:
          "You already have a pending withdrawal request. Please wait for it to be processed.",
        pendingWithdrawalId: existingPending._id,
      });
    }

    // Create withdrawal request for user
    const withdrawalData = {
      userId: user._id,
      amount,
      status: "pending",
      requestedAt: new Date(),
    };

    // Handle both paymentMethodId and bankAccount
    if (paymentMethodId) {
      withdrawalData.paymentMethodId = paymentMethodId;
    } else if (bankAccount) {
      withdrawalData.bankAccount = bankAccount;
    }

    const withdrawal = await Withdrawal.create([withdrawalData], { session });

    // Deduct from wallet
    await User.findByIdAndUpdate(
      user._id,
      { $inc: { walletBalance: -amount } },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      withdrawal: {
        id: withdrawal[0]._id,
        amount: withdrawal[0].amount,
        status: withdrawal[0].status,
        paymentMethod: paymentMethodId ? "stripe" : "bank_transfer",
        createdAt: withdrawal[0].createdAt,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Request user withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getUserWithdrawalHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const withdrawals = await Withdrawal.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Withdrawal.countDocuments(filter);

    // Calculate summary statistics
    const summary = await Withdrawal.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: withdrawals.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      withdrawals,
      summary: {
        pending: summary.find((s) => s._id === "pending")?.total || 0,
        approved: summary.find((s) => s._id === "approved")?.total || 0,
        paid: summary.find((s) => s._id === "paid")?.total || 0,
        rejected: summary.find((s) => s._id === "rejected")?.total || 0,
      },
    });
  } catch (error) {
    console.error("Get user withdrawal history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
