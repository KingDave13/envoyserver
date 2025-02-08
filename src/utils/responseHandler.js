/**
 * Custom error class for API errors
 * @extends Error
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler wrapper to eliminate try-catch blocks
 * @param {Function} fn - Function to wrap
 * @returns {Function} Wrapped function
 */
export const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {Object} [data] - Response data
 */
export const successResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message
  };

  if (data) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} [errors] - Validation errors
 */
export const errorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    error: message
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const handle404 = (req, res) => {
  errorResponse(res, 404, `Route ${req.originalUrl} not found`);
};

/**
 * Global error handler
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      status: err.status,
      statusCode: err.statusCode
    });
  }

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return errorResponse(res, err.statusCode, err.message);
  }

  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥:', err);
  errorResponse(
    res,
    500,
    process.env.NODE_ENV === 'development'
      ? err.message
      : 'Something went wrong! Please try again later.'
  );
};

/**
 * Format validation errors from express-validator
 * @param {Array} errors - Array of validation errors
 * @returns {Object} Formatted errors
 */
export const formatValidationErrors = errors => {
  const formattedErrors = {};
  errors.forEach(error => {
    const field = error.path;
    if (!formattedErrors[field]) {
      formattedErrors[field] = [];
    }
    formattedErrors[field].push(error.msg);
  });
  return formattedErrors;
};

/**
 * Handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors array
 */
export const handleValidationErrors = (req, res, errors) => {
  const formattedErrors = formatValidationErrors(errors);
  errorResponse(res, 400, 'Validation failed', formattedErrors);
};

/**
 * Handle MongoDB duplicate key errors
 * @param {Error} err - Error object
 * @returns {AppError} Formatted error
 */
export const handleDuplicateKeyError = err => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB validation errors
 * @param {Error} err - Error object
 * @returns {AppError} Formatted error
 */
export const handleValidationError = err => {
  const errors = Object.values(err.errors).map(error => error.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT errors
 * @param {Error} err - Error object
 * @returns {AppError} Formatted error
 */
export const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

/**
 * Handle JWT expired error
 * @param {Error} err - Error object
 * @returns {AppError} Formatted error
 */
export const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401);
