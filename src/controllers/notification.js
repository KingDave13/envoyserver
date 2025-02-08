import { asyncHandler, successResponse, AppError } from '../utils/responseHandler.js';
import notificationService from '../services/notificationService.js';
import { sanitizeData } from '../middleware/validate.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const unreadOnly = req.query.unread === 'true';

  const result = await notificationService.getUserNotifications(req.user.id, {
    page,
    limit,
    unreadOnly
  });

  successResponse(res, 200, 'Notifications retrieved successfully', result);
});

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);

  successResponse(res, 200, 'Unread count retrieved successfully', { count });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id);

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  // Check ownership
  if (notification.userId.toString() !== req.user.id) {
    throw new AppError('Not authorized to access this notification', 403);
  }

  successResponse(res, 200, 'Notification marked as read');
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);

  successResponse(res, 200, 'All notifications marked as read');
});

/**
 * @desc    Delete old notifications
 * @route   DELETE /api/notifications/cleanup
 * @access  Private
 */
export const deleteOldNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteOldNotifications(req.user.id);

  successResponse(res, 200, 'Old notifications deleted successfully', {
    deletedCount: result.deletedCount
  });
});

/**
 * @desc    Update notification preferences
 * @route   PUT /api/notifications/preferences
 * @access  Private
 */
export const updatePreferences = asyncHandler(async (req, res) => {
  const { preferences } = sanitizeData(req.body);

  // Update user's notification preferences in User model
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      'settings.notifications': preferences
    },
    { new: true }
  );

  successResponse(res, 200, 'Notification preferences updated successfully', {
    preferences: user.settings.notifications
  });
});

/**
 * @desc    Get notification preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
export const getPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('settings.notifications');

  successResponse(res, 200, 'Notification preferences retrieved successfully', {
    preferences: user.settings.notifications
  });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  // Check ownership
  if (notification.userId.toString() !== req.user.id) {
    throw new AppError('Not authorized to delete this notification', 403);
  }

  await notification.deleteOne();

  successResponse(res, 200, 'Notification deleted successfully');
});

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/notifications
 * @access  Private
 */
export const deleteAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user.id });

  successResponse(res, 200, 'All notifications deleted successfully');
});
