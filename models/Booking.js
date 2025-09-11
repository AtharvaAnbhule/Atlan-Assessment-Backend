import { query, withTransaction } from '../config/database.js';
import { v4 as uuidv4 } from '../utils/uuid.js';

export class Booking {
  static async create(bookingData) {
    const { user_id, event_id, quantity } = bookingData;

    return withTransaction(async (client) => {
      // Check event availability with row-level locking
      const eventResult = await client.query(`
        SELECT id, name, available_tickets, price, capacity, event_date, status
        FROM events 
        WHERE id = $1 AND status = 'active'
        FOR UPDATE
      `, [event_id]);

      if (eventResult.rows.length === 0) {
        throw new Error('Event not found or not available for booking');
      }

      const event = eventResult.rows[0];

      // Check if event date is in the future
      if (new Date(event.event_date) <= new Date()) {
        throw new Error('Cannot book tickets for past events');
      }

      // Check if enough tickets are available
      if (event.available_tickets < quantity) {
        throw new Error(`Only ${event.available_tickets} tickets available`);
      }

      // Check if user already has a confirmed booking for this event
      const existingBooking = await client.query(`
        SELECT id FROM bookings 
        WHERE user_id = $1 AND event_id = $2 AND status = 'confirmed'
      `, [user_id, event_id]);

      if (existingBooking.rows.length > 0) {
        throw new Error('User already has a confirmed booking for this event');
      }

      // Calculate total amount
      const total_amount = parseFloat(event.price) * quantity;

      // Generate unique booking reference
      const booking_reference = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create booking
      const bookingResult = await client.query(`
        INSERT INTO bookings (user_id, event_id, quantity, total_amount, booking_reference, status)
        VALUES ($1, $2, $3, $4, $5, 'confirmed')
        RETURNING *
      `, [user_id, event_id, quantity, total_amount, booking_reference]);

      // The trigger will automatically update available_tickets
      return bookingResult.rows[0];
    });
  }

  static async findById(id) {
    const result = await query(`
      SELECT b.*, e.name as event_name, e.venue, e.event_date, e.image_url,
             u.first_name || ' ' || u.last_name as user_name, u.email
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1
    `, [id]);

    return result.rows[0];
  }

  static async findByReference(booking_reference) {
    const result = await query(`
      SELECT b.*, e.name as event_name, e.venue, e.event_date, e.address, e.image_url,
             u.first_name || ' ' || u.last_name as user_name, u.email
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      JOIN users u ON b.user_id = u.id
      WHERE b.booking_reference = $1
    `, [booking_reference]);

    return result.rows[0];
  }

  static async findByUserId(user_id, filters = {}) {
    let whereClause = 'WHERE b.user_id = $1';
    let params = [user_id];
    let paramCount = 1;

    if (filters.status) {
      whereClause += ` AND b.status = $${++paramCount}`;
      params.push(filters.status);
    }

    if (filters.upcoming_only === 'true') {
      whereClause += ` AND e.event_date > CURRENT_TIMESTAMP`;
    }

    const result = await query(`
      SELECT b.*, e.name as event_name, e.venue, e.event_date, e.address, e.image_url
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      ${whereClause}
      ORDER BY b.booked_at DESC
    `, params);

    return result.rows;
  }

  static async cancel(bookingId, userId) {
    return withTransaction(async (client) => {
      // Get booking details with lock
      const bookingResult = await client.query(`
        SELECT b.*, e.event_date, e.name as event_name
        FROM bookings b
        JOIN events e ON b.event_id = e.id
        WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'confirmed'
        FOR UPDATE
      `, [bookingId, userId]);

      if (bookingResult.rows.length === 0) {
        throw new Error('Booking not found or cannot be cancelled');
      }

      const booking = bookingResult.rows[0];

      // Check if event is more than 24 hours away
      const eventDate = new Date(booking.event_date);
      const now = new Date();
      const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

      if (hoursUntilEvent < 24) {
        throw new Error('Cannot cancel booking less than 24 hours before event');
      }

      // Cancel the booking
      const result = await client.query(`
        UPDATE bookings 
        SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [bookingId]);

      // The trigger will automatically update available_tickets
      return result.rows[0];
    });
  }

  static async getBookingStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN total_amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'confirmed' THEN total_amount ELSE NULL END) as avg_booking_value,
        SUM(CASE WHEN status = 'confirmed' THEN quantity ELSE 0 END) as total_tickets_sold
      FROM bookings
      WHERE booked_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    return result.rows[0];
  }

  static async getDailyBookingStats(days = 30) {
    const result = await query(`
      SELECT 
        DATE(booked_at) as date,
        COUNT(*) as bookings,
        SUM(CASE WHEN status = 'confirmed' THEN total_amount ELSE 0 END) as revenue,
        SUM(CASE WHEN status = 'confirmed' THEN quantity ELSE 0 END) as tickets_sold
      FROM bookings
      WHERE booked_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(booked_at)
      ORDER BY date DESC
    `);

    return result.rows;
  }

  static async getEventBookings(eventId, userId) {
    const result = await query(`
      SELECT b.*, u.first_name || ' ' || u.last_name as user_name, u.email
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN events e ON b.event_id = e.id
      WHERE e.id = $1 AND e.created_by = $2
      ORDER BY b.booked_at DESC
    `, [eventId, userId]);

    return result.rows;
  }
}