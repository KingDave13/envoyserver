import express from 'express';
import { body, query } from 'express-validator';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteOldNotifications,
  updatePreferences,
  getPreferences,
  deleteNotification,
  deleteAllNotifications
} from '../controllers/notification.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Notification preferences validation
const preferencesValidation = [
  body('preferences')
    .isObject().withMessage('Preferences must be an object'),
  body('preferences.email')
    .optional()
    .isBoolean().withMessage('Email preference must be a boolean'),
  body('preferences.push')
    .optional()
    .isBoolean().withMessage('Push notification preference must be a boolean'),
  body('preferences.payment_verification')
    .optional()
    .isBoolean().withMessage('Payment verification preference must be a boolean'),
  body('preferences.payment_confirmed')
    .optional()
    .isBoolean().withMessage('Payment confirmation preference must be a boolean'),
  body('preferences.shipment_status')
    .optional()
    .isBoolean().withMessage('Shipment status preference must be a boolean'),
  body('preferences.draft_expiry')
    .optional()
    .isBoolean().withMessage('Draft expiry preference must be a boolean'),
  body('preferences.pickup_reminder')
    .optional()
    .isBoolean().withMessage('Pickup reminder preference must be a boolean')
];

// Query validation
const listQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('unread')
    .optional()
    .isBoolean().withMessage('Unread must be a boolean')
];

// Protect all routes
router.use(protect);

// Get notifications with pagination and filters
router.get(
  '/',
  validate(listQueryValidation),
  getNotifications
);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Mark notification as read
router.put('/:id/read', markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', markAllAsRead);

// Delete old notifications
router.delete('/cleanup', deleteOldNotifications);

// Update notification preferences
router.put(
  '/preferences',
  validate(preferencesValidation),
  updatePreferences
);

// Get notification preferences
router.get('/preferences', getPreferences);

// Delete specific notification
router.delete('/:id', deleteNotification);

// Delete all notifications
router.delete('/', deleteAllNotifications);

export default router;
