import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: "Too many requests from this IP",
    code: "RATE_LIMIT_EXCEEDED",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 booking attempts per minute
  message: {
    error: "Too many booking attempts, please try again later",
    code: "BOOKING_RATE_LIMIT_EXCEEDED",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per 15 minutes
  message: {
    error: "Too many authentication attempts from this IP",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 admin operations per minute
  message: {
    error: "Too many admin operations, please slow down",
    code: "ADMIN_RATE_LIMIT_EXCEEDED",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
