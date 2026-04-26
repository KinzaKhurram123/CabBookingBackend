const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createPaymentIntent,
  confirmPaymentIntent,
  setupPaymentMethod,
  getUserCards,
  setDefaultCard,
  removeCard,
  getPaymentStatus,
  confirmPaymentMethod,
} = require("../controllers/paymentController");

router.post("/create-intent", protect, createPaymentIntent);
router.post("/confirm", protect, confirmPaymentIntent);
router.post("/setup", protect, setupPaymentMethod);
router.post("/confirm-method", protect, confirmPaymentMethod);
router.get("/cards", protect, getUserCards);
router.put("/cards/default", protect, setDefaultCard);
router.delete("/cards/remove/:paymentMethodId", protect, removeCard);
router.get("/status/:bookingId", protect, getPaymentStatus);

module.exports = router;
