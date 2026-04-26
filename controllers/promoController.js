const Promotion = require("../models/promotion");
const RideBooking = require("../models/rideBooking");

// ─── USER: Validate & Apply Promo Code ───────────────────────────────────────

exports.validatePromoCode = async (req, res) => {
  try {
    const { code, fare } = req.body;
    const userId = req.user._id;

    if (!code || !fare) {
      return res.status(400).json({ success: false, message: "Code and fare are required" });
    }

    const promo = await Promotion.findOne({ code: code.toUpperCase(), isActive: true });

    if (!promo) {
      return res.status(404).json({ success: false, message: "Invalid promo code" });
    }

    const now = new Date();

    // Check validity dates
    if (now < promo.validFrom) {
      return res.status(400).json({ success: false, message: "Promo code is not active yet" });
    }
    if (now > promo.validUntil) {
      return res.status(400).json({ success: false, message: "Promo code has expired" });
    }

    // Check usage limit
    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ success: false, message: "Promo code usage limit reached" });
    }

    // Check minimum order amount
    if (fare < promo.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum fare of ${promo.minOrderAmount} required for this promo code`,
      });
    }

    // Check per-user usage limit
    if (promo.perUserLimit) {
      const userUsageCount = await RideBooking.countDocuments({
        user: userId,
        promoCode: code.toUpperCase(),
      });
      if (userUsageCount >= promo.perUserLimit) {
        return res.status(400).json({
          success: false,
          message: `You have already used this promo code ${promo.perUserLimit} time(s)`,
        });
      }
    }

    // Check applicableFor
    if (!promo.applicableFor.includes("all")) {
      const totalRides = await RideBooking.countDocuments({ user: userId, status: "completed" });

      if (promo.applicableFor.includes("new_users") && totalRides > 0) {
        return res.status(400).json({ success: false, message: "This promo is for new users only" });
      }
      if (promo.applicableFor.includes("first_ride") && totalRides > 0) {
        return res.status(400).json({ success: false, message: "This promo is for first ride only" });
      }
      if (promo.applicableFor.includes("existing_users") && totalRides === 0) {
        return res.status(400).json({ success: false, message: "This promo is for existing users only" });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.discountType === "percentage") {
      discountAmount = (fare * promo.discountValue) / 100;
      if (promo.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, promo.maxDiscountAmount);
      }
    } else {
      discountAmount = promo.discountValue;
    }

    discountAmount = Math.min(discountAmount, fare); // can't exceed fare
    const finalFare = Math.max(0, fare - discountAmount);

    res.status(200).json({
      success: true,
      message: "Promo code applied successfully",
      promo: {
        code: promo.code,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      },
      originalFare: fare,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalFare: parseFloat(finalFare.toFixed(2)),
    });
  } catch (error) {
    console.error("Validate promo error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── ADMIN: Create Promo Code ─────────────────────────────────────────────────

exports.createPromoCode = async (req, res) => {
  try {
    const {
      code, description, discountType, discountValue,
      minOrderAmount, maxDiscountAmount, validFrom, validUntil,
      usageLimit, perUserLimit, applicableFor, isActive,
    } = req.body;

    if (!code || !discountType || !discountValue || !validUntil) {
      return res.status(400).json({
        success: false,
        message: "code, discountType, discountValue, validUntil are required",
      });
    }

    const existing = await Promotion.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Promo code already exists" });
    }

    const promo = await Promotion.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      validFrom: validFrom || new Date(),
      validUntil,
      usageLimit: usageLimit || null,
      perUserLimit: perUserLimit || 1,
      applicableFor: applicableFor || ["all"],
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, message: "Promo code created", promo });
  } catch (error) {
    console.error("Create promo error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── ADMIN: Get All Promo Codes ───────────────────────────────────────────────

exports.getAllPromoCodes = async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const total = await Promotion.countDocuments(filter);
    const promos = await Promotion.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: promos,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── ADMIN: Update Promo Code ─────────────────────────────────────────────────

exports.updatePromoCode = async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!promo) return res.status(404).json({ success: false, message: "Promo not found" });
    res.status(200).json({ success: true, message: "Promo updated", promo });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── ADMIN: Delete Promo Code ─────────────────────────────────────────────────

exports.deletePromoCode = async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: "Promo not found" });
    res.status(200).json({ success: true, message: "Promo deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── ADMIN: Toggle Active Status ─────────────────────────────────────────────

exports.togglePromoStatus = async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: "Promo not found" });
    promo.isActive = !promo.isActive;
    await promo.save();
    res.status(200).json({ success: true, message: `Promo ${promo.isActive ? "activated" : "deactivated"}`, promo });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
