import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  verifyEmail,
  resendVerification
} from '../controllers/auth.js';
import { protect, verifyResetToken } from '../middleware/auth.js';
import { validate, commonValidations } from '../middleware/validate.js';

const router = express.Router();

// Registration validation
const registerValidation = [
  body('email')
    .notEmpty().withMessage(commonValidations.email.notEmpty)
    .isEmail().withMessage(commonValidations.email.isEmail),
  body('password')
    .notEmpty().withMessage(commonValidations.password.notEmpty)
    .isLength({ min: 8 }).withMessage(commonValidations.password.minLength)
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/)
    .withMessage(commonValidations.password.pattern),
  body('firstName')
    .notEmpty().withMessage(commonValidations.name.notEmpty)
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .notEmpty().withMessage(commonValidations.name.notEmpty)
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .notEmpty().withMessage(commonValidations.phone.notEmpty)
    .matches(/^\+?[\d\s-()]{8,}$/).withMessage('Please provide a valid phone number'),
  body('country')
    .notEmpty().withMessage(commonValidations.country.notEmpty)
    .isISO31661Alpha2().withMessage(commonValidations.country.isISO31661Alpha2)
];

// Login validation
const loginValidation = [
  body('email')
    .notEmpty().withMessage(commonValidations.email.notEmpty)
    .isEmail().withMessage(commonValidations.email.isEmail),
  body('password')
    .notEmpty().withMessage(commonValidations.password.notEmpty)
];

// Password validation
const passwordValidation = [
  body('password')
    .notEmpty().withMessage(commonValidations.password.notEmpty)
    .isLength({ min: 8 }).withMessage(commonValidations.password.minLength)
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/)
    .withMessage(commonValidations.password.pattern)
];

// Update password validation
const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage(commonValidations.password.notEmpty)
    .isLength({ min: 8 }).withMessage(commonValidations.password.minLength)
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/)
    .withMessage(commonValidations.password.pattern)
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

// Email validation
const emailValidation = [
  body('email')
    .notEmpty().withMessage(commonValidations.email.notEmpty)
    .isEmail().withMessage(commonValidations.email.isEmail)
];

// Public routes
router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);
router.post('/forgot-password', validate(emailValidation), forgotPassword);
router.put('/reset-password/:token', verifyResetToken, validate(passwordValidation), resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', validate(emailValidation), resendVerification);

// Protected routes
router.use(protect);

router.get('/me', getMe);
router.post('/logout', logout);
router.put('/update-password', validate(updatePasswordValidation), updatePassword);

export default router;
