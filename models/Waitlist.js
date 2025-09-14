import { query, withTransaction } from "../config/database.js";

export class Waitlist {
  static async join(user_id, event_id, quantity) {
    return withTransaction(async (client) => {
      const eventResult = await client.query(
        `
        SELECT id, name, available_tickets, capacity
        FROM events 
        WHERE id = $1 AND status = 'active'
      `,
        [event_id]
      );

      if (eventResult.rows.length === 0) {
        throw new Error("Event not found or not available");
      }

      const event = eventResult.rows[0];

      if (event.available_tickets >= quantity) {
        throw new Error("Tickets are still available for this event");
      }

      const existingWaitlist = await client.query(
        `
        SELECT id FROM waitlist 
        WHERE user_id = $1 AND event_id = $2 AND status = 'waiting'
      `,
        [user_id, event_id]
      );

      if (existingWaitlist.rows.length > 0) {
        throw new Error("User is already on the waitlist for this event");
      }

      const result = await client.query(
        `
        INSERT INTO waitlist (user_id, event_id, quantity, status)
        VALUES ($1, $2, $3, 'waiting')
        RETURNING *
      `,
        [user_id, event_id, quantity]
      );

      return result.rows[0];
    });
  }

  static async leave(user_id, event_id) {
    const result = await query(
      `
      DELETE FROM waitlist 
      WHERE user_id = $1 AND event_id = $2 AND status = 'waiting'
      RETURNING *
    `,
      [user_id, event_id]
    );

    return result.rows[0];
  }

  static async getByUserId(user_id) {
    const result = await query(
      `
      SELECT w.*, e.name as event_name, e.venue, e.event_date, e.image_url
      FROM waitlist w
      JOIN events e ON w.event_id = e.id
      WHERE w.user_id = $1 AND w.status = 'waiting'
      ORDER BY w.joined_at ASC
    `,
      [user_id]
    );

    return result.rows;
  }

  static async getByEventId(event_id) {
    const result = await query(
      `
      SELECT w.*, u.first_name || ' ' || u.last_name as user_name, u.email
      FROM waitlist w
      JOIN users u ON w.user_id = u.id
      WHERE w.event_id = $1 AND w.status = 'waiting'
      ORDER BY w.priority DESC, w.joined_at ASC
    `,
      [event_id]
    );

    return result.rows;
  }

  static async getNotifications(user_id) {
    const result = await query(
      `
      SELECT w.*, e.name as event_name, e.venue, e.event_date, e.available_tickets
      FROM waitlist w
      JOIN events e ON w.event_id = e.id
      WHERE w.user_id = $1 AND w.status = 'notified' 
        AND w.expires_at > CURRENT_TIMESTAMP
      ORDER BY w.notified_at DESC
    `,
      [user_id]
    );

    return result.rows;
  }

  static async markAsExpired(id) {
    const result = await query(
      `
      UPDATE waitlist 
      SET status = 'expired'
      WHERE id = $1
      RETURNING *
    `,
      [id]
    );

    return result.rows[0];
  }
}
