import { query, withTransaction } from "../config/database.js";

export class Event {
  static async create(eventData, userId) {
    const {
      name,
      description,
      venue,
      address,
      event_date,
      capacity,
      price,
      category,
      image_url,
      status = "active",
    } = eventData;

    const result = await query(
      `
      INSERT INTO events (
        name, description, venue, address, event_date, capacity, 
        available_tickets, price, category, image_url, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `,
      [
        name,
        description,
        venue,
        address,
        event_date,
        capacity,
        capacity,
        price,
        category,
        image_url,
        status,
        userId,
      ]
    );

    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `
      SELECT e.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `,
      [id]
    );

    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let whereClause = "WHERE e.status = $1";
    let params = [filters.status || "active"];
    let paramCount = 1;

    if (filters.category) {
      whereClause += ` AND e.category = $${++paramCount}`;
      params.push(filters.category);
    }

    if (filters.search) {
      whereClause += ` AND (e.name ILIKE $${++paramCount} OR e.description ILIKE $${
        ++paramCount + 1
      })`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
      paramCount += 2;
    }

    if (filters.date_from) {
      whereClause += ` AND e.event_date >= $${++paramCount}`;
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      whereClause += ` AND e.event_date <= $${++paramCount}`;
      params.push(filters.date_to);
    }

    if (filters.available_only === "true") {
      whereClause += ` AND e.available_tickets > 0`;
    }

    const orderBy =
      filters.sort_by === "price"
        ? "e.price"
        : filters.sort_by === "capacity"
        ? "e.capacity"
        : "e.event_date";
    const orderDirection = filters.sort_order === "desc" ? "DESC" : "ASC";

    const limit = Math.min(parseInt(filters.limit) || 10, 100);
    const offset = (parseInt(filters.page) - 1 || 0) * limit;

    const mainParams = [...params, limit, offset];

    const result = await query(
      `
    SELECT e.*, u.first_name || ' ' || u.last_name as created_by_name,
           (e.capacity - e.available_tickets) as booked_tickets
    FROM events e
    LEFT JOIN users u ON e.created_by = u.id
    ${whereClause}
    ORDER BY ${orderBy} ${orderDirection}
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `,
      mainParams
    );

    const countResult = await query(
      `
    SELECT COUNT(*) as total
    FROM events e
    ${whereClause}
  `,
      params
    );

    return {
      events: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(filters.page) || 1,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
    };
  }

  static async update(id, eventData, userId) {
    const {
      name,
      description,
      venue,
      address,
      event_date,
      capacity,
      price,
      category,
      image_url,
      status,
    } = eventData;

    const currentEvent = await this.findById(id);
    if (!currentEvent) {
      throw new Error("Event not found");
    }

    const bookedTickets =
      currentEvent.capacity - currentEvent.available_tickets;
    const newAvailableTickets = capacity - bookedTickets;

    if (newAvailableTickets < 0) {
      throw new Error("Cannot reduce capacity below currently booked tickets");
    }

    const result = await query(
      `
      UPDATE events 
      SET name = $1, description = $2, venue = $3, address = $4, 
          event_date = $5, capacity = $6, available_tickets = $7,
          price = $8, category = $9, image_url = $10, status = $11,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12 AND created_by = $13
      RETURNING *
    `,
      [
        name,
        description,
        venue,
        address,
        event_date,
        capacity,
        newAvailableTickets,
        price,
        category,
        image_url,
        status,
        id,
        userId,
      ]
    );

    return result.rows[0];
  }

  static async delete(id, userId) {
    const bookingCheck = await query(
      `
      SELECT COUNT(*) as booking_count
      FROM bookings 
      WHERE event_id = $1 AND status = 'confirmed'
    `,
      [id]
    );

    if (parseInt(bookingCheck.rows[0].booking_count) > 0) {
      throw new Error("Cannot delete event with confirmed bookings");
    }

    const result = await query(
      `
      DELETE FROM events 
      WHERE id = $1 AND created_by = $2
      RETURNING *
    `,
      [id, userId]
    );

    return result.rows[0];
  }

  static async getBookingStats(eventId) {
    const result = await query(
      `
      SELECT 
        e.name,
        e.capacity,
        e.available_tickets,
        (e.capacity - e.available_tickets) as booked_tickets,
        ROUND(((e.capacity - e.available_tickets)::DECIMAL / e.capacity * 100), 2) as utilization_percentage,
        COUNT(b.id) as total_bookings,
        SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END) as total_revenue,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancellations
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id
      WHERE e.id = $1
      GROUP BY e.id, e.name, e.capacity, e.available_tickets
    `,
      [eventId]
    );

    return result.rows[0];
  }

  static async getPopularEvents(limit = 10) {
    const result = await query(
      `
      SELECT e.*, 
             COUNT(b.id) as total_bookings,
             SUM(b.quantity) as total_tickets_sold,
             SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END) as total_revenue
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id AND b.status = 'confirmed'
      WHERE e.status = 'active'
      GROUP BY e.id
      ORDER BY total_tickets_sold DESC
      LIMIT $1
    `,
      [limit]
    );

    return result.rows;
  }
}
