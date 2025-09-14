import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";

import { generalLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import bookingRoutes from "./routes/bookings.js";
import waitlistRoutes from "./routes/waitlist.js";
import adminRoutes from "./routes/admin.js";

import { testConnection } from "./config/database.js";
import { initializeScheduledJobs } from "./jobs/scheduler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://evently-app.com", "https://www.evently-app.com"]
        : [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
          ],
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(generalLimiter);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.get("/", (req, res) => {
  res.json({
    name: "Evently Backend API",
    version: "1.0.0",
    description: "Scalable event booking backend with concurrency handling",
    endpoints: {
      auth: "/api/auth",
      events: "/api/events",
      bookings: "/api/bookings",
      waitlist: "/api/waitlist",
      admin: "/api/admin",
    },
    features: [
      "User authentication & authorization",
      "Event creation & management",
      "Concurrent booking system",
      "Waitlist functionality",
      "Real-time analytics",
      "Admin dashboard",
      "Rate limiting & security",
    ],
    documentation: "https://github.com/evently-backend/docs",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);

app.use(errorHandler);

const startServer = async () => {
  try {
    console.log("🔄 Testing database connection...");
    const isConnected = await testConnection();

    if (!isConnected) {
      console.error(
        "❌ Failed to connect to database. Please check your DATABASE_URL environment variable."
      );
      process.exit(1);
    }

    if (process.env.NODE_ENV !== "test") {
      initializeScheduledJobs();
    }

    app.listen(PORT, () => {
      console.log("🚀 Evently Backend Server Started!");
      console.log(`📍 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/`);
      console.log("✅ All systems operational!");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT. Starting graceful shutdown...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM. Starting graceful shutdown...");
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error.message);
  console.error(error.stack);
  process.exit(1);
});

startServer();

export default app;
