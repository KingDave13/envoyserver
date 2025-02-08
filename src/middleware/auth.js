import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/responseHandler.js';
import User from '../models/User.js';
import { AppError } from '../utils/responseHandler.js';

/**
 * Protect routes - Verify token and attach user to request
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header or cookies
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    throw new AppError('Not authorized to access this route', 401);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new AppError('Please verify your email to access this route', 401);
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(
        user.passwordChangedAt.getTime() / 1000,
        10
      );

      if (decoded.iat < changedTimestamp) {
        throw new AppError('Password recently changed, please login again', 401);
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    throw new AppError('Not authorized to access this route', 401);
  }
});

/**
 * Optional authentication - Attach user to request if token exists
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header or cookies
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // If no token, continue without user
  if (!token) {
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id);
    if (!user) {
      return next();
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(
        user.passwordChangedAt.getTime() / 1000,
        10
      );

      if (decoded.iat < changedTimestamp) {
        return next();
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next();
  }
});

/**
 * Authorize roles
 * @param  {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `User role ${req.user.role} is not authorized to access this route`,
        403
      );
    }
    next();
  };
};

/**
 * Verify reset password token
 */
export const verifyResetToken = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Attach user to request
  req.user = user;
  next();
});

/**
 * Verify email verification token
 */
export const verifyEmailToken = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const verificationToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    verificationToken,
    verificationTokenExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  // Attach user to request
  req.user = user;
  next();
});

/**
 * Check ownership
 * @param {string} modelName - Model name
 * @param {string} paramName - Parameter name containing ID
 */
export const checkOwnership = (modelName, paramName = 'id') => {
  return asyncHandler(async (req, res, next) => {
    const Model = mongoose.model(modelName);
    const doc = await Model.findById(req.params[paramName]);

    if (!doc) {
      throw new AppError(`${modelName} not found`, 404);
    }

    if (doc.userId && doc.userId.toString() !== req.user.id) {
      throw new AppError(`Not authorized to access this ${modelName}`, 403);
    }

    // Attach document to request
    req[modelName.toLowerCase()] = doc;
    next();
  });
};
