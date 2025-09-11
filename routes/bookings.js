import express from 'express';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate, createBookingSchema } from '../middleware/validation.js';
import { bookingLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get user's bookings
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const filters = req.query;
  const bookings = await Booking.findByUserId(req.user.id, filters);

  res.json({
    message: 'Bookings retrieved successfully',
    bookings
  });
}));

// Get booking by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({
      error: 'Invalid booking ID',
      code: 'INVALID_BOOKING_ID'
    });
  }

  const booking = await Booking.findById(parseInt(id));
  
  if (!booking) {
    return res.status(404).json({
      error: 'Booking not found',
      code: 'BOOKING_NOT_FOUND'
    });
  }

  // Check if user owns the booking or is admin
  if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      code: 'ACCESS_DENIED'
    });
  }

  res.json({
    message: 'Booking retrieved successfully',
    booking
  });
}));

// Get booking by reference
router.get('/reference/:reference', asyncHandler(async (req, res) => {
  const { reference } = req.params;

  const booking = await Booking.findByReference(reference);
  
  if (!booking) {
    return res.status(404).json({
      error: 'Booking not found',
      code: 'BOOKING_NOT_FOUND'
    });
  }

  // Return limited info for public access
  res.json({
    message: 'Booking retrieved successfully',
    booking: {
      id: booking.id,
      booking_reference: booking.booking_reference,
      event_name: booking.event_name,
      venue: booking.venue,
      event_date: booking.event_date,
      quantity: booking.quantity,
      total_amount: booking.total_amount,
      status: booking.status,
      booked_at: booking.booked_at
    }
  });
}));

// Create new booking
router.post('/', authenticateToken, bookingLimiter, validate(createBookingSchema), asyncHandler(async (req, res) => {
  const { event_id, quantity } = req.body;
  
  // Check max tickets per user
  const maxTicketsPerUser = parseInt(process.env.MAX_TICKETS_PER_USER) || 10;
  if (quantity > maxTicketsPerUser) {
    return res.status(400).json({
      error: `Maximum ${maxTicketsPerUser} tickets allowed per booking`,
      code: 'QUANTITY_LIMIT_EXCEEDED'
    });
  }

  try {
    const booking = await Booking.create({
      user_id: req.user.id,
      event_id,
      quantity
    });

    // Get complete booking details
    const completeBooking = await Booking.findById(booking.id);

    res.status(201).json({
      message: 'Booking created successfully',
      booking: completeBooking
    });
  } catch (error) {
    if (error.message.includes('available') || error.message.includes('capacity')) {
      return res.status(409).json({
        error: error.message,
        code: 'INSUFFICIENT_AVAILABILITY'
      });
    }
    if (error.message.includes('already has a confirmed booking')) {
      return res.status(409).json({
        error: error.message,
        code: 'DUPLICATE_BOOKING'
      });
    }
    if (error.message.includes('past events')) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_EVENT_DATE'
      });
    }
    throw error;
  }
}));

// Cancel booking
router.put('/:id/cancel', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({
      error: 'Invalid booking ID',
      code: 'INVALID_BOOKING_ID'
    });
  }

  try {
    const booking = await Booking.cancel(parseInt(id), req.user.id);

    res.json({
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('cannot be cancelled')) {
      return res.status(404).json({
        error: error.message,
        code: 'BOOKING_NOT_FOUND_OR_CANNOT_CANCEL'
      });
    }
    if (error.message.includes('24 hours')) {
      return res.status(400).json({
        error: error.message,
        code: 'CANCELLATION_DEADLINE_PASSED'
      });
    }
    throw error;
  }
}));

// Get booking statistics (admin only)
router.get('/analytics/stats', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const stats = await Booking.getBookingStats();

  res.json({
    message: 'Booking statistics retrieved successfully',
    stats
  });
}));

// Get daily booking statistics (admin only)
router.get('/analytics/daily', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const stats = await Booking.getDailyBookingStats(days);

  res.json({
    message: 'Daily booking statistics retrieved successfully',
    stats,
    period_days: days
  });
}));

export default router;