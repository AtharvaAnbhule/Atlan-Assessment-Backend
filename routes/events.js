import express from "express";
import { Event } from "../models/Event.js";
import { Booking } from "../models/Booking.js";
import {
  authenticateToken,
  requireAdmin,
  optionalAuth,
} from "../middleware/auth.js";
import {
  validate,
  createEventSchema,
  updateEventSchema,
  eventFilterSchema,
} from "../middleware/validation.js";
import { adminLimiter } from "../middleware/rateLimiter.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = express.Router();

router.get(
  "/",
  optionalAuth,
  validate(eventFilterSchema, "query"),
  asyncHandler(async (req, res) => {
    const filters = req.query;
    const result = await Event.findAll(filters);

    res.json({
      message: "Events retrieved successfully",
      ...result,
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        error: "Invalid event ID",
        code: "INVALID_EVENT_ID",
      });
    }

    const event = await Event.findById(parseInt(id));

    if (!event) {
      return res.status(404).json({
        error: "Event not found",
        code: "EVENT_NOT_FOUND",
      });
    }

    res.json({
      message: "Event retrieved successfully",
      event,
    });
  })
);

router.get(
  "/:id/stats",
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        error: "Invalid event ID",
        code: "INVALID_EVENT_ID",
      });
    }

    const stats = await Event.getBookingStats(parseInt(id));

    if (!stats) {
      return res.status(404).json({
        error: "Event not found",
        code: "EVENT_NOT_FOUND",
      });
    }

    res.json({
      message: "Event statistics retrieved successfully",
      stats,
    });
  })
);

router.get(
  "/:id/bookings",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        error: "Invalid event ID",
        code: "INVALID_EVENT_ID",
      });
    }

    const event = await Event.findById(parseInt(id));
    if (!event) {
      return res.status(404).json({
        error: "Event not found",
        code: "EVENT_NOT_FOUND",
      });
    }

    if (req.user.role !== "admin" && event.created_by !== req.user.id) {
      return res.status(403).json({
        error:
          "Access denied. Only event creators and admins can view bookings.",
        code: "ACCESS_DENIED",
      });
    }

    const bookings = await Booking.getEventBookings(parseInt(id), req.user.id);

    res.json({
      message: "Event bookings retrieved successfully",
      bookings,
    });
  })
);

router.post(
  "/",
  authenticateToken,
  requireAdmin,
  adminLimiter,
  validate(createEventSchema),
  asyncHandler(async (req, res) => {
    const eventData = req.body;
    const event = await Event.create(eventData, req.user.id);

    res.status(201).json({
      message: "Event created successfully",
      event,
    });
  })
);

router.put(
  "/:id",
  authenticateToken,
  adminLimiter,
  validate(updateEventSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const eventData = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        error: "Invalid event ID",
        code: "INVALID_EVENT_ID",
      });
    }

    const existingEvent = await Event.findById(parseInt(id));
    if (!existingEvent) {
      return res.status(404).json({
        error: "Event not found",
        code: "EVENT_NOT_FOUND",
      });
    }

    if (req.user.role !== "admin" && existingEvent.created_by !== req.user.id) {
      return res.status(403).json({
        error:
          "Access denied. Only event creators and admins can update events.",
        code: "ACCESS_DENIED",
      });
    }

    const event = await Event.update(parseInt(id), eventData, req.user.id);

    if (!event) {
      return res.status(404).json({
        error: "Event not found or access denied",
        code: "EVENT_NOT_FOUND_OR_ACCESS_DENIED",
      });
    }

    res.json({
      message: "Event updated successfully",
      event,
    });
  })
);

router.delete(
  "/:id",
  authenticateToken,
  adminLimiter,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        error: "Invalid event ID",
        code: "INVALID_EVENT_ID",
      });
    }

    const existingEvent = await Event.findById(parseInt(id));
    if (!existingEvent) {
      return res.status(404).json({
        error: "Event not found",
        code: "EVENT_NOT_FOUND",
      });
    }

    if (req.user.role !== "admin" && existingEvent.created_by !== req.user.id) {
      return res.status(403).json({
        error:
          "Access denied. Only event creators and admins can delete events.",
        code: "ACCESS_DENIED",
      });
    }

    const event = await Event.delete(parseInt(id), req.user.id);

    if (!event) {
      return res.status(404).json({
        error: "Event not found or cannot be deleted",
        code: "EVENT_DELETE_FAILED",
      });
    }

    res.json({
      message: "Event deleted successfully",
      event,
    });
  })
);

router.get(
  "/analytics/popular",
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const events = await Event.getPopularEvents(limit);

    res.json({
      message: "Popular events retrieved successfully",
      events,
    });
  })
);

export default router;
