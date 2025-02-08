import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/responseHandler.js';
import User from '../models/User.js';

/**
 * Optional authentication middleware
 * Attaches user to req if token is valid, but doesn't require authentication
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookie
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  // If no token, continue as guest
  if (!token) {
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next();
    }

    // Check if token was issued before password change
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return next();
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    // If token is invalid, continue as guest
    next();
  }
});

export default optionalAuth;
