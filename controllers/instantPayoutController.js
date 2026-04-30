const Rider = require("../models/riderModel");
const Withdrawal = require("../models/withdrawal");
const mongoose = require("mongoose");

// Constants for instant payout
const INSTANT_PAYOUT_MINIMUM = 60; // $60 USD
const INSTANT_PAYOUT_DAILY_LIMIT = 3;
const INSTANT_PAYOUT_FIXED_FEE = 0.50;
const INSTANT_PAYOUT_PERCENTAGE_FEE = 0.01; // 1%

// Calculate instant payout fee: MAX($0.50, amount * 0.01)
const calculateInstantPayoutFee = (amount) => {
  return Math.max(INSTANT_PAYOUT_FIXED_FEE, amount * INSTANT_PAYOUT_PERCENTAGE_FEE);
};

// Request instant payout
exports.requestInstantPayout = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Valid payout amount is required",
      });
    }

    const rider = await Rider.findOne({ user: req.user._id }).session(session);
    if (!rider) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    // Check if rider is verified (all documents approved)
    if (!rider.isVerified) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: "Driver verification incomplete. Please upload and get all required documents approved.",
        requiresVerification: true,
      });
    }

    // Check if rider account is active
    if (rider.status === "inactive") {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact support.",
      });
    }

    // Check minimum threshold ($60)
    if (amount < INSTANT_PAYOUT_MINIMUM) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Minimum payout amount is $${INSTANT_PAYOUT_MINIMUM}`,
        minimumAmount: INSTANT_PAYOUT_MINIMUM,
      });
    }

    // Check daily instant payout limit (3 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Reset count if last payout was on a different day
    if (!rider.lastInstantPayoutDate || rider.lastInstantPayoutDate < today) {
      rider.instantPayoutCount = 0;
      rider.lastInstantPayoutDate = new Date();
    }

    if (rider.instantPayoutCount >= INSTANT_PAYOUT_DAILY_LIMIT) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Daily instant payout limit reached (${INSTANT_PAYOUT_DAILY_LIMIT} per day)`,
        dailyLimit: INSTANT_PAYOUT_DAILY_LIMIT,
        remainingToday: 0,
      });
    }

    // Calculate fee
    const fee = calculateInstantPayoutFee(amount);
    const totalDeduction = amount + fee;

    // Check wallet balance
    if (rider.walletBalance < totalDeduction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Available: $${rider.walletBalance.toFixed(2)}, Required: $${totalDeduction.toFixed(2)} (including $${fee.toFixed(2)} fee)`,
        availableBalance: rider.walletBalance,
        requestedAmount: amount,
        fee: fee,
        totalRequired: totalDeduction,
      });
    }

    // Check for existing pending payout
    const existingPending = await Withdrawal.findOne({
      rider: rider._id,
      status: { $in: ["pending", "processing"] },
    }).session(session);

    if (existingPending) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "You have a pending payout request. Please wait for it to be processed.",
        pendingPayoutId: existingPending._id,
      });
    }

    // Check bank account information
    if (!rider.bankAccount || !rider.bankAccount.accountNumber || !rider.bankAccount.bankName) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Bank account details required. Please add bank account first.",
        requiresBankAccount: true,
      });
    }

    // For instant payouts, card number is required
    if (!rider.bankAccount.cardNumber) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Card number required for instant payouts. Please update your bank account details.",
        requiresCardNumber: true,
      });
    }

    // Deduct amount + fee from wallet atomically
    const updatedRider = await Rider.findByIdAndUpdate(
      rider._id,
      {
        $inc: {
          walletBalance: -totalDeduction,
          instantPayoutCount: 1,
        },
        lastInstantPayoutDate: new Date(),
      },
      { session, new: true }
    );

    // Create instant payout withdrawal record
    const withdrawal = await Withdrawal.create(
      [
        {
          rider: rider._id,
          amount: amount,
          fee: fee,
          payoutType: "instant",
          status: "pending",
          bankAccount: {
            accountTitle: rider.bankAccount.accountTitle,
            accountNumber: rider.bankAccount.accountNumber,
            bankName: rider.bankAccount.bankName,
            branchCode: rider.bankAccount.branchCode,
            routingNumber: rider.bankAccount.routingNumber,
            cardNumber: rider.bankAccount.cardNumber,
          },
          requestedAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Instant payout request submitted successfully",
      payout: {
        id: withdrawal[0]._id,
        amount: withdrawal[0].amount,
        fee: withdrawal[0].fee,
        netAmount: amount - fee,
        payoutType: withdrawal[0].payoutType,
        status: withdrawal[0].status,
        createdAt: withdrawal[0].createdAt,
      },
      wallet: {
        previousBalance: rider.walletBalance,
        newBalance: updatedRider.walletBalance,
        deducted: totalDeduction,
      },
      dailyLimit: {
        used: updatedRider.instantPayoutCount,
        remaining: INSTANT_PAYOUT_DAILY_LIMIT - updatedRider.instantPayoutCount,
        total: INSTANT_PAYOUT_DAILY_LIMIT,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Request instant payout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get instant payout fee preview
exports.getInstantPayoutFee = async (req, res) => {
  try {
    const { amount } = req.query;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const numAmount = parseFloat(amount);

    if (numAmount < INSTANT_PAYOUT_MINIMUM) {
      return res.status(400).json({
        success: false,
        message: `Minimum payout amount is $${INSTANT_PAYOUT_MINIMUM}`,
        minimumAmount: INSTANT_PAYOUT_MINIMUM,
      });
    }

    const fee = calculateInstantPayoutFee(numAmount);
    const totalDeduction = numAmount + fee;

    res.json({
      success: true,
      amount: numAmount,
      fee: fee,
      totalDeduction: totalDeduction,
      netAmount: numAmount - fee,
      feeCalculation: {
        fixedFee: INSTANT_PAYOUT_FIXED_FEE,
        percentageFee: `${INSTANT_PAYOUT_PERCENTAGE_FEE * 100}%`,
        formula: `MAX($${INSTANT_PAYOUT_FIXED_FEE}, amount * ${INSTANT_PAYOUT_PERCENTAGE_FEE})`,
      },
    });
  } catch (error) {
    console.error("Get instant payout fee error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Check instant payout eligibility
exports.checkInstantPayoutEligibility = async (req, res) => {
  try {
    const rider = await Rider.findOne({ user: req.user._id }).select(
      "isVerified status walletBalance instantPayoutCount lastInstantPayoutDate bankAccount"
    );

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let dailyCount = rider.instantPayoutCount;
    if (!rider.lastInstantPayoutDate || rider.lastInstantPayoutDate < today) {
      dailyCount = 0;
    }

    const eligibility = {
      isEligible: true,
      issues: [],
    };

    // Check verification
    if (!rider.isVerified) {
      eligibility.isEligible = false;
      eligibility.issues.push({
        type: "verification",
        message: "Driver verification incomplete. Please upload and get all required documents approved.",
      });
    }

    // Check account status
    if (rider.status === "inactive") {
      eligibility.isEligible = false;
      eligibility.issues.push({
        type: "account_status",
        message: "Your account is inactive. Please contact support.",
      });
    }

    // Check wallet balance
    if (rider.walletBalance < INSTANT_PAYOUT_MINIMUM) {
      eligibility.isEligible = false;
      eligibility.issues.push({
        type: "insufficient_balance",
        message: `Insufficient wallet balance. Minimum required: $${INSTANT_PAYOUT_MINIMUM}`,
        availableBalance: rider.walletBalance,
        minimumRequired: INSTANT_PAYOUT_MINIMUM,
      });
    }

    // Check daily limit
    if (dailyCount >= INSTANT_PAYOUT_DAILY_LIMIT) {
      eligibility.isEligible = false;
      eligibility.issues.push({
        type: "daily_limit_reached",
        message: `Daily instant payout limit reached (${INSTANT_PAYOUT_DAILY_LIMIT} per day)`,
        used: dailyCount,
        limit: INSTANT_PAYOUT_DAILY_LIMIT,
      });
    }

    // Check bank account
    if (!rider.bankAccount || !rider.bankAccount.accountNumber || !rider.bankAccount.bankName) {
      eligibility.isEligible = false;
      eligibility.issues.push({
        type: "missing_bank_account",
        message: "Bank account details required. Please add bank account first.",
      });
    }

    // Check card number
    if (!rider.bankAccount || !rider.bankAccount.cardNumber) {
      eligibility.isEligible = false;
      eligibility.issues.push({
        type: "missing_card_number",
        message: "Card number required for instant payouts. Please update your bank account details.",
      });
    }

    res.json({
      success: true,
      eligibility: eligibility.isEligible,
      issues: eligibility.issues,
      wallet: {
        balance: rider.walletBalance,
        minimumRequired: INSTANT_PAYOUT_MINIMUM,
      },
      dailyLimit: {
        used: dailyCount,
        remaining: Math.max(0, INSTANT_PAYOUT_DAILY_LIMIT - dailyCount),
        total: INSTANT_PAYOUT_DAILY_LIMIT,
      },
      verification: {
        isVerified: rider.isVerified,
      },
      bankAccount: {
        configured: !!(rider.bankAccount && rider.bankAccount.accountNumber),
        hasCardNumber: !!(rider.bankAccount && rider.bankAccount.cardNumber),
      },
    });
  } catch (error) {
    console.error("Check instant payout eligibility error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get rider wallet balance
exports.getWalletBalance = async (req, res) => {
  try {
    const rider = await Rider.findOne({ user: req.user._id }).select(
      "walletBalance totalWithdrawn"
    );

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    res.json({
      success: true,
      wallet: {
        balance: rider.walletBalance,
        totalWithdrawn: rider.totalWithdrawn || 0,
      },
    });
  } catch (error) {
    console.error("Get wallet balance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  requestInstantPayout: exports.requestInstantPayout,
  getInstantPayoutFee: exports.getInstantPayoutFee,
  checkInstantPayoutEligibility: exports.checkInstantPayoutEligibility,
  getWalletBalance: exports.getWalletBalance,
};
