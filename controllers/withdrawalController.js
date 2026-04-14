const Rider = require("../models/riderModel");
const Withdrawal = require("../models/withdrawal");

exports.getWallet = async (req, res) => {
  try {
    const rider = await Rider.findOne({ user: req.user._id }).select(
      "walletBalance totalEarning totalWithdrawn pendingEarnings bankAccount totalRides",
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

    res.json({
      success: true,
      wallet: {
        balance: rider.walletBalance,
        totalEarning: rider.totalEarning,
        totalWithdrawn: rider.totalWithdrawn,
        pendingWithdrawal: pendingAmount,
        availableForWithdrawal: Math.max(
          0,
          rider.walletBalance - pendingAmount,
        ),
        totalRides: rider.totalRides,
        bankAccount: rider.bankAccount,
      },
    });
  } catch (error) {
    console.error("Get wallet error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, bankAccount } = req.body;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid amount is required" });
    }

    const rider = await Rider.findOne({ user: req.user._id });
    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    // Check pending withdrawals
    const pendingWithdrawals = await Withdrawal.aggregate([
      { $match: { rider: rider._id, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingAmount = pendingWithdrawals[0]?.total || 0;
    const available = rider.walletBalance - pendingAmount;

    if (amount > available) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ${available.toFixed(2)}`,
        available,
      });
    }

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal amount is 100",
      });
    }

    // Use provided bank account or saved one
    const bank = bankAccount || rider.bankAccount;
    if (!bank || !bank.accountNumber || !bank.bankName) {
      return res.status(400).json({
        success: false,
        message:
          "Bank account details required. Please add bank account first.",
      });
    }

    // Save bank account if new one provided
    if (bankAccount) {
      rider.bankAccount = bankAccount;
      await rider.save();
    }

    const withdrawal = await Withdrawal.create({
      rider: rider._id,
      amount,
      status: "pending",
      bankAccount: bank,
    });

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      withdrawal: {
        id: withdrawal._id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        bankAccount: withdrawal.bankAccount,
        createdAt: withdrawal.createdAt,
      },
    });
  } catch (error) {
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

    res.json({
      success: true,
      count: withdrawals.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      withdrawals,
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
    const { accountTitle, accountNumber, bankName, branchCode } = req.body;

    if (!accountTitle || !accountNumber || !bankName) {
      return res.status(400).json({
        success: false,
        message: "accountTitle, accountNumber, and bankName are required",
      });
    }

    const rider = await Rider.findOneAndUpdate(
      { user: req.user._id },
      {
        bankAccount: { accountTitle, accountNumber, bankName, branchCode },
      },
      { new: true },
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

exports.adminGetWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const withdrawals = await Withdrawal.find(filter)
      .populate({
        path: "rider",
        select: "bankAccount totalEarning walletBalance",
        populate: { path: "user", select: "name email phone" },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Withdrawal.countDocuments(filter);

    res.json({
      success: true,
      count: withdrawals.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      withdrawals,
    });
  } catch (error) {
    console.error("Admin get withdrawals error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.adminApproveWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { note } = req.body;

    const withdrawal =
      await Withdrawal.findById(withdrawalId).populate("rider");
    if (!withdrawal) {
      return res
        .status(404)
        .json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve. Current status: ${withdrawal.status}`,
      });
    }

    // Deduct from wallet
    const rider = await Rider.findById(withdrawal.rider._id);
    if (rider.walletBalance < withdrawal.amount) {
      return res.status(400).json({
        success: false,
        message: "Rider has insufficient wallet balance",
      });
    }

    await Rider.findByIdAndUpdate(withdrawal.rider._id, {
      $inc: {
        walletBalance: -withdrawal.amount,
        totalWithdrawn: withdrawal.amount,
      },
    });

    withdrawal.status = "approved";
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    withdrawal.note = note || null;
    await withdrawal.save();

    res.json({
      success: true,
      message: "Withdrawal approved successfully",
      withdrawal,
    });
  } catch (error) {
    console.error("Admin approve withdrawal error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.adminRejectWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res
        .status(400)
        .json({ success: false, message: "Rejection reason is required" });
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return res
        .status(404)
        .json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject. Current status: ${withdrawal.status}`,
      });
    }

    withdrawal.status = "rejected";
    withdrawal.rejectionReason = rejectionReason;
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    await withdrawal.save();

    res.json({
      success: true,
      message: "Withdrawal rejected",
      withdrawal,
    });
  } catch (error) {
    console.error("Admin reject withdrawal error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.adminMarkAsPaid = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { note } = req.body;

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
    await withdrawal.save();

    res.json({
      success: true,
      message: "Withdrawal marked as paid",
      withdrawal,
    });
  } catch (error) {
    console.error("Admin mark as paid error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
