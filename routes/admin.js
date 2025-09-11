import express from "express";
import { User } from "../models/User.js";
import { Event } from "../models/Event.js";
import { Booking } from "../models/Booking.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { adminLimiter } from "../middleware/rateLimiter.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = express.Router();

// Apply admin authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(requireAdmin);
router.use(adminLimiter);

// Get dashboard overview statistics
router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const [bookingStats, popularEvents] = await Promise.all([
      Booking.getBookingStats(),
      Event.getPopularEvents(5),
    ]);

    // Get total users count
    const allUsers = await User.getAllUsers();
    const totalUsers = allUsers.length;
    const adminUsers = allUsers.filter((user) => user.role === "admin").length;

    // Get events statistics
    const allEvents = await Event.findAll({ status: "active", limit: 1000 });
    const totalEvents = allEvents.total;

    res.json({
      message: "Dashboard statistics retrieved successfully",
      stats: {
        users: {
          total: totalUsers,
          admins: adminUsers,
          regular: totalUsers - adminUsers,
        },
        events: {
          total: totalEvents,
          active: totalEvents,
        },
        bookings: bookingStats,
        popular_events: popularEvents,
      },
    });
  })
);

// Get all users
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await User.getAllUsers();

    res.json({
      message: "Users retrieved successfully",
      users,
    });
  })
);

// Get user details by ID
router.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        error: "Invalid user ID",
        code: "INVALID_USER_ID",
      });
    }

    const user = await User.findById(parseInt(id));

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Get user's bookings
    const bookings = await Booking.findByUserId(parseInt(id));

    res.json({
      message: "User details retrieved successfully",
      user,
      bookings,
    });
  })
);

// Get all events (admin view with all statuses)
router.get(
  "/events",
  asyncHandler(async (req, res) => {
    const filters = {
      ...req.query,
      // Remove status filter to show all events
      status: undefined,
    };

    const result = await Event.findAll(filters);

    res.json({
      message: "All events retrieved successfully",
      ...result,
    });
  })
);

// Get comprehensive event analytics
router.get(
  "/events/:id/analytics",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        error: "Invalid event ID",
        code: "INVALID_EVENT_ID",
      });
    }

    const [stats, bookings] = await Promise.all([
      Event.getBookingStats(parseInt(id)),
      Booking.getEventBookings(parseInt(id), req.user.id),
    ]);

    if (!stats) {
      return res.status(404).json({
        error: "Event not found",
        code: "EVENT_NOT_FOUND",
      });
    }

    // Calculate additional analytics
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
    const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

    const analytics = {
      ...stats,
      bookings_breakdown: {
        total: totalBookings,
        confirmed: confirmedBookings.length,
        cancelled: cancelledBookings.length,
        cancellation_rate:
          totalBookings > 0
            ? ((cancelledBookings.length / totalBookings) * 100).toFixed(2)
            : 0,
      },
      recent_bookings: bookings.slice(0, 10), // Last 10 bookings
    };

    res.json({
      message: "Event analytics retrieved successfully",
      analytics,
    });
  })
);

// System health check
router.get(
  "/health",
  asyncHandler(async (req, res) => {
    const startTime = Date.now();

    try {
      // Test database connectivity
      const dbTestResult = await User.findById(1);
      const dbResponseTime = Date.now() - startTime;

      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: {
          status: "connected",
          response_time_ms: dbResponseTime,
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
        },
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: {
          status: "disconnected",
          error: error.message,
        },
      });
    }
  })
);

export default router;
