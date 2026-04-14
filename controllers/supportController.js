const SupportTicket = require("../models/supportTicket");
const pusher = require("../config/pusher");

// ─── USER: Create ticket ──────────────────────────────────────────────────────
exports.createTicket = async (req, res) => {
  try {
    const { category, subject, message, priority, bookingId, bookingType } = req.body;
    const userId = req.user._id;

    if (!category || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "category, subject, and message are required",
      });
    }

    const ticket = await SupportTicket.create({
      user: userId,
      category,
      subject,
      message,
      priority: priority || "medium",
      bookingId: bookingId || null,
      bookingType: bookingType || null,
    });

    const populated = await SupportTicket.findById(ticket._id)
      .populate("user", "name email phoneNumber");

    // Notify admin via pusher
    try {
      await pusher.trigger("support-admin", "new-ticket", {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        category: ticket.category,
        subject: ticket.subject,
        priority: ticket.priority,
        userName: populated.user?.name,
        timestamp: new Date().toISOString(),
      });
    } catch (pusherError) {
      console.error("Pusher error (non-critical):", pusherError.message);
    }

    res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      ticket: populated,
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── USER: Get my tickets ─────────────────────────────────────────────────────
exports.getMyTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const tickets = await SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-replies");

    const total = await SupportTicket.countDocuments(filter);

    res.json({
      success: true,
      count: tickets.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      tickets,
    });
  } catch (error) {
    console.error("Get my tickets error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── USER: Get single ticket with replies ────────────────────────────────────
exports.getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === "admin";

    const ticket = await SupportTicket.findById(ticketId)
      .populate("user", "name email phoneNumber profileImage")
      .populate("replies.sender", "name role")
      .populate("assignedTo", "name email");

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    // Only owner or admin can view
    if (!isAdmin && ticket.user._id.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── USER: Reply to ticket ────────────────────────────────────────────────────
exports.replyToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const userId = req.user._id;
    const isAdmin = req.user.role === "admin";

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (!isAdmin && ticket.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (ticket.status === "closed") {
      return res.status(400).json({ success: false, message: "Cannot reply to a closed ticket" });
    }

    ticket.replies.push({
      sender: userId,
      senderRole: isAdmin ? "admin" : "user",
      message,
    });

    // If admin replies, set to in_progress
    if (isAdmin && ticket.status === "open") {
      ticket.status = "in_progress";
    }

    await ticket.save();

    // Notify the other party via pusher
    try {
      const channel = isAdmin
        ? `support-user-${ticket.user}` // notify user
        : "support-admin";               // notify admin

      await pusher.trigger(channel, "ticket-reply", {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        message,
        senderRole: isAdmin ? "admin" : "user",
        timestamp: new Date().toISOString(),
      });
    } catch (pusherError) {
      console.error("Pusher error (non-critical):", pusherError.message);
    }

    const updated = await SupportTicket.findById(ticketId)
      .populate("replies.sender", "name role");

    res.json({
      success: true,
      message: "Reply sent successfully",
      ticket: updated,
    });
  } catch (error) {
    console.error("Reply ticket error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── USER: Close ticket ───────────────────────────────────────────────────────
exports.closeTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user._id;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (ticket.user.toString() !== userId.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    ticket.status = "closed";
    ticket.resolvedAt = new Date();
    await ticket.save();

    res.json({ success: true, message: "Ticket closed successfully" });
  } catch (error) {
    console.error("Close ticket error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── ADMIN: Get all tickets ───────────────────────────────────────────────────
exports.adminGetAllTickets = async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const tickets = await SupportTicket.find(filter)
      .populate("user", "name email phoneNumber")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-replies");

    const total = await SupportTicket.countDocuments(filter);

    // Stats
    const stats = await SupportTicket.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusStats = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    stats.forEach((s) => { statusStats[s._id] = s.count; });

    res.json({
      success: true,
      count: tickets.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      stats: statusStats,
      tickets,
    });
  } catch (error) {
    console.error("Admin get tickets error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── ADMIN: Update ticket status ─────────────────────────────────────────────
exports.adminUpdateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, priority, assignedTo } = req.body;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo) ticket.assignedTo = assignedTo;
    if (status === "resolved") ticket.resolvedAt = new Date();

    await ticket.save();

    // Notify user
    try {
      await pusher.trigger(`support-user-${ticket.user}`, "ticket-status-update", {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        timestamp: new Date().toISOString(),
      });
    } catch (pusherError) {
      console.error("Pusher error (non-critical):", pusherError.message);
    }

    res.json({
      success: true,
      message: "Ticket updated successfully",
      ticket,
    });
  } catch (error) {
    console.error("Admin update ticket error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
