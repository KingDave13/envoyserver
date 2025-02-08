import { validationResult } from 'express-validator';
import { AppError } from '../utils/responseHandler.js';
import sanitizeHtml from 'sanitize-html';

/**
 * Validation middleware
 * @param {Array} validations - Array of validation chains
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Get validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      throw new AppError(errorMessages[0], 400);
    }

    next();
  };
};

/**
 * Common validation messages
 */
export const commonValidations = {
  email: {
    notEmpty: 'Email is required',
    isEmail: 'Please provide a valid email'
  },
  password: {
    notEmpty: 'Password is required',
    minLength: 'Password must be at least 8 characters',
    pattern: 'Password must contain at least one letter, one number, and one special character'
  },
  name: {
    notEmpty: 'Name is required'
  },
  phone: {
    notEmpty: 'Phone number is required'
  },
  country: {
    notEmpty: 'Country is required',
    isISO31661Alpha2: 'Please provide a valid country code (e.g., NG for Nigeria)'
  },
  postalCode: {
    notEmpty: 'Postal code is required'
  },
  weight: {
    notEmpty: 'Weight is required',
    isNumeric: 'Weight must be a number',
    min: 'Weight must be at least 0.1 kg'
  },
  dimensions: {
    notEmpty: 'Dimension is required',
    isNumeric: 'Dimension must be a number'
  },
  shipmentType: {
    notEmpty: 'Shipment type is required',
    isIn: 'Shipment type must be either international or local'
  },
  date: {
    notEmpty: 'Date is required',
    isDate: 'Please provide a valid date'
  }
};

/**
 * Sanitize data
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
export const sanitizeData = (data) => {
  const sanitizedData = {};

  // Recursive function to handle nested objects
  const sanitizeObject = (obj) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? sanitizeObject(item) : sanitizeValue(item)
        );
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = sanitizeValue(value);
      }
    }
    return sanitized;
  };

  // Sanitize individual value
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // HTML sanitization options
      const options = {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'discard'
      };

      // Sanitize HTML and trim
      return sanitizeHtml(value, options).trim();
    }
    return value;
  };

  return sanitizeObject(data);
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} Whether ID is valid
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether phone number is valid
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s-()]{8,}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export const validatePasswordStrength = (password) => {
  const result = {
    isValid: false,
    errors: []
  };

  // Length check
  if (password.length < 8) {
    result.errors.push('Password must be at least 8 characters');
  }

  // Letter check
  if (!/[A-Za-z]/.test(password)) {
    result.errors.push('Password must contain at least one letter');
  }

  // Number check
  if (!/\d/.test(password)) {
    result.errors.push('Password must contain at least one number');
  }

  // Special character check
  if (!/[@$!%*#?&]/.test(password)) {
    result.errors.push('Password must contain at least one special character');
  }

  result.isValid = result.errors.length === 0;
  return result;
};

/**
 * Validate date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean} Whether date range is valid
 */
export const isValidDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum size in bytes
 * @returns {boolean} Whether file size is valid
 */
export const isValidFileSize = (size, maxSize = 10 * 1024 * 1024) => {
  return size <= maxSize;
};

/**
 * Validate file type
 * @param {string} mimeType - File MIME type
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @returns {boolean} Whether file type is valid
 */
export const isValidFileType = (mimeType, allowedTypes) => {
  return allowedTypes.includes(mimeType);
};
