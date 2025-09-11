import cron from "node-cron";
import { query } from "../config/database.js";

const cleanupExpiredEntries = async () => {
  try {
    console.log("🧹 Starting cleanup of expired entries...");

    const expiredWaitlistResult = await query(`
      UPDATE waitlist 
      SET status = 'expired' 
      WHERE status = 'notified' 
        AND expires_at < CURRENT_TIMESTAMP
      RETURNING id
    `);

    console.log(
      `✅ Cleaned up ${expiredWaitlistResult.rowCount} expired waitlist entries`
    );

    const oldCancelledResult = await query(`
      DELETE FROM bookings 
      WHERE status = 'cancelled' 
        AND cancelled_at < CURRENT_DATE - INTERVAL '30 days'
      RETURNING id
    `);

    console.log(
      `✅ Cleaned up ${oldCancelledResult.rowCount} old cancelled bookings`
    );
  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
  }
};

const updateBookingAnalytics = async () => {
  try {
    console.log("📊 Updating booking analytics...");

    await query(`
      INSERT INTO booking_analytics (event_id, date, total_bookings, total_revenue, cancellations)
      SELECT 
        e.id as event_id,
        CURRENT_DATE as date,
        COALESCE(stats.total_bookings, 0) as total_bookings,
        COALESCE(stats.total_revenue, 0) as total_revenue,
        COALESCE(stats.cancellations, 0) as cancellations
      FROM events e
      LEFT JOIN (
        SELECT 
          event_id,
          COUNT(*) as total_bookings,
          SUM(CASE WHEN status = 'confirmed' THEN total_amount ELSE 0 END) as total_revenue,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancellations
        FROM bookings 
        WHERE DATE(booked_at) = CURRENT_DATE
        GROUP BY event_id
      ) stats ON e.id = stats.event_id
      ON CONFLICT (event_id, date) DO UPDATE SET
        total_bookings = EXCLUDED.total_bookings,
        total_revenue = EXCLUDED.total_revenue,
        cancellations = EXCLUDED.cancellations
    `);

    console.log("✅ Booking analytics updated successfully");
  } catch (error) {
    console.error("❌ Error updating booking analytics:", error.message);
  }
};

const markCompletedEvents = async () => {
  try {
    console.log("🏁 Checking for completed events...");

    const completedEventsResult = await query(`
      UPDATE events 
      SET status = 'completed' 
      WHERE event_date < CURRENT_TIMESTAMP 
        AND status = 'active'
      RETURNING id, name
    `);

    if (completedEventsResult.rowCount > 0) {
      console.log(
        `✅ Marked ${completedEventsResult.rowCount} events as completed:`
      );
      completedEventsResult.rows.forEach((event) => {
        console.log(`   - ${event.name} (ID: ${event.id})`);
      });
    } else {
      console.log("✅ No events to mark as completed");
    }
  } catch (error) {
    console.error("❌ Error marking completed events:", error.message);
  }
};

// Initialize scheduled jobs
export const initializeScheduledJobs = () => {
  console.log("⏰ Initializing scheduled jobs...");

  cron.schedule("0 2 * * *", cleanupExpiredEntries);

  cron.schedule("0 1 * * *", updateBookingAnalytics);

  cron.schedule("0 * * * *", markCompletedEvents);

  setTimeout(cleanupExpiredEntries, 5000);
  setTimeout(updateBookingAnalytics, 10000);
  setTimeout(markCompletedEvents, 15000);

  console.log("✅ Scheduled jobs initialized successfully");
};

export default {
  initializeScheduledJobs,
  cleanupExpiredEntries,
  updateBookingAnalytics,
  markCompletedEvents,
};
