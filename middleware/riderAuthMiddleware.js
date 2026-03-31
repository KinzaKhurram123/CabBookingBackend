const { protect } = require("./authMiddleware");
const Rider = require("../models/riderModel");

const riderProtect = async (req, res, next) => {
  await protect(req, res, async () => {
    try {
      const rider = await Rider.findOne({ user: req.user._id });
      if (!rider) {
        return res.status(401).json({ message: "Rider profile not found for this user" });
      }
      req.rider = rider;
      next();
    } catch (error) {
      res.status(500).json({ message: "Error fetching rider profile" });
    }
  });
};

module.exports = { riderProtect };
