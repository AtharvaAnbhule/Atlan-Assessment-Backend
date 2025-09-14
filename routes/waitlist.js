import express from "express";
import { Waitlist } from "../models/Waitlist.js";
import { authenticateToken } from "../middleware/auth.js";
import { validate, joinWaitlistSchema } from "../middleware/validation.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const waitlistEntries = await Waitlist.getByUserId(req.user.id);

    res.json({
      message: "Waitlist entries retrieved successfully",
      waitlist: waitlistEntries,
    });
  })
);

router.post(
  "/join",
  authenticateToken,
  validate(joinWaitlistSchema),
  asyncHandler(async (req, res) => {
    const { event_id, quantity } = req.body;

    try {
      const waitlistEntry = await Waitlist.join(
        req.user.id,
        event_id,
        quantity
      );

      res.status(201).json({
        message: "Successfully joined waitlist",
        waitlist_entry: waitlistEntry,
      });
    } catch (error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("not available")
      ) {
        return res.status(404).json({
          error: error.message,
          code: "EVENT_NOT_FOUND_OR_UNAVAILABLE",
        });
      }
      if (error.message.includes("still available")) {
        return res.status(400).json({
          error: error.message,
          code: "TICKETS_STILL_AVAILABLE",
        });
      }
      if (error.message.includes("already on the waitlist")) {
        return res.status(409).json({
          error: error.message,
          code: "ALREADY_ON_WAITLIST",
        });
      }
      throw error;
    }
  })
);

router.delete(
  "/:event_id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { event_id } = req.params;

    if (isNaN(event_id)) {
      return res.status(400).json({
        error: "Invalid event ID",
        code: "INVALID_EVENT_ID",
      });
    }

    const waitlistEntry = await Waitlist.leave(req.user.id, parseInt(event_id));

    if (!waitlistEntry) {
      return res.status(404).json({
        error: "Waitlist entry not found",
        code: "WAITLIST_ENTRY_NOT_FOUND",
      });
    }

    res.json({
      message: "Successfully left waitlist",
      waitlist_entry: waitlistEntry,
    });
  })
);

router.get(
  "/notifications",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const notifications = await Waitlist.getNotifications(req.user.id);

    res.json({
      message: "Waitlist notifications retrieved successfully",
      notifications,
    });
  })
);

router.get(
  "/event/:event_id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { event_id } = req.params;

    if (isNaN(event_id)) {
      return res.status(400).json({
        error: "Invalid event ID",
        code: "INVALID_EVENT_ID",
      });
    }

    const waitlistEntries = await Waitlist.getByEventId(parseInt(event_id));

    res.json({
      message: "Event waitlist retrieved successfully",
      waitlist: waitlistEntries,
    });
  })
);

export default router;
