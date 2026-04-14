const User = require("../models/user");
const ReferralTransaction = require("../models/referralTransaction");
const crypto = require("crypto");

// Referral reward config
const REFERRAL_REWARD = {
  referrer: 50,   // jo refer kare usse milega
  referee: 20,    // jo naya join kare usse milega
};

// ─── Generate unique referral code ───────────────────────────────────────────
const generateReferralCode = (userId) => {
  const hash = crypto
    .createHash("sha256")
    .update(userId.toString())
    .digest("hex")
    .toUpperCase()
    .slice(0, 8);
  return `REF${hash}`;
};

// ─── GET: My referral info ────────────────────────────────────────────────────
exports.getMyReferral = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "name referralCode referralCount walletBalance totalEarnedFromReferrals referredBy",
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate code if not exists
    if (!user.referralCode) {
      user.referralCode = generateReferralCode(user._id);
      await user.save();
    }

    // Get referred users list
    const referredUsers = await User.find({ referredBy: user._id })
      .select("name email createdAt")
      .sort({ createdAt: -1 })
      .limit(20);

    // Get transaction history
    const transactions = await ReferralTransaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("referredUser", "name email");

    res.json({
      success: true,
      referral: {
        referralCode: user.referralCode,
        referralCount: user.referralCount,
        walletBalance: user.walletBalance,
        totalEarned: user.totalEarnedFromReferrals,
        rewards: {
          youEarn: REFERRAL_REWARD.referrer,
          friendEarns: REFERRAL_REWARD.referee,
        },
        referredUsers,
        transactions,
      },
    });
  } catch (error) {
    console.error("Get referral error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── POST: Apply referral code at signup ─────────────────────────────────────
// Called internally from registerUser — not a direct API
exports.applyReferralCode = async (referralCode, newUserId) => {
  try {
    if (!referralCode) return;

    const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
    if (!referrer) return; // Invalid code — silently ignore

    const newUser = await User.findById(newUserId);
    if (!newUser) return;

    // Prevent self-referral
    if (referrer._id.toString() === newUserId.toString()) return;

    // Prevent double referral
    if (newUser.referredBy) return;

    // Credit referrer
    await User.findByIdAndUpdate(referrer._id, {
      $inc: {
        walletBalance: REFERRAL_REWARD.referrer,
        totalEarnedFromReferrals: REFERRAL_REWARD.referrer,
        referralCount: 1,
      },
    });

    await ReferralTransaction.create({
      user: referrer._id,
      referredUser: newUserId,
      type: "referral_bonus",
      amount: REFERRAL_REWARD.referrer,
      description: `Referral bonus for inviting ${newUser.name}`,
      status: "credited",
    });

    // Credit new user
    await User.findByIdAndUpdate(newUserId, {
      referredBy: referrer._id,
      $inc: {
        walletBalance: REFERRAL_REWARD.referee,
      },
    });

    await ReferralTransaction.create({
      user: newUserId,
      referredUser: newUserId,
      type: "referral_signup",
      amount: REFERRAL_REWARD.referee,
      description: `Welcome bonus for joining with referral code`,
      status: "credited",
    });

    console.log(`Referral applied: ${referrer.name} referred ${newUser.name}`);
  } catch (error) {
    console.error("Apply referral error:", error);
  }
};

// ─── GET: Wallet balance & transaction history ────────────────────────────────
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "name walletBalance totalEarnedFromReferrals referralCount",
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const transactions = await ReferralTransaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("referredUser", "name email");

    const totalCredit = transactions
      .filter((t) => t.status === "credited")
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      wallet: {
        balance: user.walletBalance,
        totalEarned: user.totalEarnedFromReferrals,
        referralCount: user.referralCount,
        transactions,
        totalCredit,
      },
    });
  } catch (error) {
    console.error("Get wallet error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── POST: Validate referral code (check before signup) ──────────────────────
exports.validateReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ success: false, message: "Referral code required" });
    }

    const referrer = await User.findOne({
      referralCode: referralCode.toUpperCase(),
    }).select("name referralCode");

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral code",
      });
    }

    res.json({
      success: true,
      message: "Valid referral code",
      referrer: {
        name: referrer.name,
        code: referrer.referralCode,
      },
      reward: REFERRAL_REWARD.referee,
    });
  } catch (error) {
    console.error("Validate referral error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── ADMIN: Get all referral stats ───────────────────────────────────────────
exports.adminGetReferralStats = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const topReferrers = await User.find({ referralCount: { $gt: 0 } })
      .select("name email referralCode referralCount totalEarnedFromReferrals walletBalance")
      .sort({ referralCount: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalReferrals = await User.countDocuments({ referredBy: { $ne: null } });
    const totalBonusPaid = await ReferralTransaction.aggregate([
      { $match: { status: "credited" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalReferrals,
        totalBonusPaid: totalBonusPaid[0]?.total || 0,
        topReferrers,
      },
    });
  } catch (error) {
    console.error("Admin referral stats error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
