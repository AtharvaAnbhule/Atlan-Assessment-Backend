export const errorHandler = (err, req, res, next) => {
  console.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Database connection errors
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
    return res.status(503).json({
      error: "Service temporarily unavailable",
      code: "DATABASE_CONNECTION_ERROR",
    });
  }

  // Database constraint violations
  if (err.code === "23505") {
    // Unique violation
    return res.status(409).json({
      error: "Resource already exists",
      code: "DUPLICATE_RESOURCE",
      details: err.detail,
    });
  }

  if (err.code === "23503") {
    // Foreign key violation
    return res.status(400).json({
      error: "Invalid reference to related resource",
      code: "FOREIGN_KEY_VIOLATION",
    });
  }

  if (err.code === "23514") {
    return res.status(400).json({
      error: "Data validation failed",
      code: "CHECK_CONSTRAINT_VIOLATION",
      details: err.detail,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid authentication token",
      code: "INVALID_TOKEN",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Authentication token expired",
      code: "TOKEN_EXPIRED",
    });
  }

  // Validation errors (from Joi)
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: err.details,
    });
  }

  if (err.message && typeof err.message === "string") {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      error: err.message,
      code: err.code || "BUSINESS_LOGIC_ERROR",
    });
  }

  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: "ROUTE_NOT_FOUND",
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
