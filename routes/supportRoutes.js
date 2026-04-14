const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  createTicket,
  getMyTickets,
  getTicketById,
  replyToTicket,
  closeTicket,
  adminGetAllTickets,
  adminUpdateTicketStatus,
} = require("../controllers/supportController");

// ─── User routes ──────────────────────────────────────────────────────────────
router.post("/create", protect, createTicket);
router.get("/my-tickets", protect, getMyTickets);
router.get("/:ticketId", protect, getTicketById);
router.post("/:ticketId/reply", protect, replyToTicket);
router.put("/:ticketId/close", protect, closeTicket);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get("/admin/all", protect, authorize("admin"), adminGetAllTickets);
router.put("/admin/:ticketId/status", protect, authorize("admin"), adminUpdateTicketStatus);

module.exports = router;
