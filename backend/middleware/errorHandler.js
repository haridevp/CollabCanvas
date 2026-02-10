/**
 * Global error handling middleware
 * Standardizes all error responses across the API
 */

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 * Must be registered AFTER all other middleware and routes
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    err = new AppError(message, 400);
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists`;
    err = new AppError(message, 400);
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    err = new AppError("Invalid token", 401);
  }

  if (err.name === "TokenExpiredError") {
    err = new AppError("Token expired", 401);
  }

  // Cast errors (MongoDB invalid ObjectId)
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}: ${err.value}`;
    err = new AppError(message, 400);
  }

  // Standardized error response
  console.error(
    `[${new Date().toISOString()}] ${err.statusCode} - ${err.message}`,
  );

  res.status(err.statusCode).json({
    success: false,
    statusCode: err.statusCode,
    message: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
};
