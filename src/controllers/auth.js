import { asyncHandler, successResponse, AppError } from '../utils/responseHandler.js';
import User from '../models/User.js';
import emailService from '../utils/email.js';
import { sanitizeData } from '../middleware/validate.js';

/**
 * Send token response with cookie
 * @param {Object} user - User object
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Response object
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message: 'Authentication successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified
        }
      }
    });
};

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const userData = sanitizeData(req.body);

  // Create user
  const user = await User.create(userData);

  // Generate verification token
  const verificationToken = user.generateVerificationToken();
  await user.save();

  // Create verification url
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

  // Send welcome email with verification link
  await emailService.sendWelcomeEmail(user, verificationUrl);

  successResponse(res, 201, 'Registration successful. Please check your email to verify your account.');
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = sanitizeData(req.body);

  // Check for user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if email is verified
  if (!user.isVerified) {
    throw new AppError('Please verify your email to login', 401);
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Find user by verification token
  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  // Update user
  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  successResponse(res, 200, 'Email verification successful. You can now login.');
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = sanitizeData(req.body);

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Generate reset token
  const resetToken = user.generateResetPasswordToken();
  await user.save();

  // Create reset url
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    await emailService.sendPasswordResetEmail(user, resetUrl);
    successResponse(res, 200, 'Password reset email sent');
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    throw new AppError('Email could not be sent', 500);
  }
});

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = sanitizeData(req.body);

  // Get user
  const user = req.user;

  // Update password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  successResponse(res, 200, 'Password reset successful');
});

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = sanitizeData(req.body);

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  successResponse(res, 200, 'Logged out successfully');
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  successResponse(res, 200, 'User profile retrieved', { user });
});

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = sanitizeData(req.body);

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isVerified) {
    throw new AppError('Email is already verified', 400);
  }

  // Generate verification token
  const verificationToken = user.generateVerificationToken();
  await user.save();

  // Create verification url
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

  // Send verification email
  await emailService.sendWelcomeEmail(user, verificationUrl);

  successResponse(res, 200, 'Verification email resent');
});
