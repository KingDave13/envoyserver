import Notification from '../models/Notification.js';

class NotificationService {
  constructor() {
    this.notificationTemplates = {
      payment_verification: {
        title: 'Payment Verification Required',
        message: 'Your bank transfer payment is awaiting verification.'
      },
      payment_confirmed: {
        title: 'Payment Confirmed',
        message: 'Your payment has been verified and confirmed.'
      },
      payment_rejected: {
        title: 'Payment Rejected',
        message: 'Your payment could not be verified. Please contact support.'
      },
      shipment_status: {
        title: 'Shipment Status Update',
        message: 'Your shipment status has been updated.'
      },
      draft_expiry: {
        title: 'Draft Expiring Soon',
        message: 'Your shipment draft will expire in 2 days.'
      },
      pickup_reminder: {
        title: 'Pickup Reminder',
        message: 'Your shipment is scheduled for pickup tomorrow.'
      },
      delivery_update: {
        title: 'Delivery Update',
        message: 'There is an update about your delivery.'
      }
    };
  }

  /**
   * Create a notification
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(data) {
    const template = this.notificationTemplates[data.type] || {};
    
    const notification = await Notification.createNotification({
      ...data,
      title: data.title || template.title,
      message: data.message || template.message
    });

    return notification;
  }

  /**
   * Create payment verification notification
   * @param {string} userId - User ID
   * @param {Object} shipment - Shipment object
   * @returns {Promise<Object>} Created notification
   */
  async createPaymentVerificationNotification(userId, shipment) {
    return this.createNotification({
      userId,
      type: 'payment_verification',
      data: {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        amount: shipment.cost.total
      },
      priority: 'high'
    });
  }

  /**
   * Create payment confirmation notification
   * @param {string} userId - User ID
   * @param {Object} shipment - Shipment object
   * @returns {Promise<Object>} Created notification
   */
  async createPaymentConfirmationNotification(userId, shipment) {
    return this.createNotification({
      userId,
      type: 'payment_confirmed',
      data: {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber
      }
    });
  }

  /**
   * Create payment rejection notification
   * @param {string} userId - User ID
   * @param {Object} shipment - Shipment object
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Created notification
   */
  async createPaymentRejectionNotification(userId, shipment, reason) {
    return this.createNotification({
      userId,
      type: 'payment_rejected',
      message: `Payment rejected: ${reason}`,
      data: {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        reason
      },
      priority: 'high'
    });
  }

  /**
   * Create shipment status notification
   * @param {string} userId - User ID
   * @param {Object} shipment - Shipment object
   * @param {string} status - New status
   * @returns {Promise<Object>} Created notification
   */
  async createShipmentStatusNotification(userId, shipment, status) {
    const statusMessages = {
      awaiting_pickup: 'Your shipment is ready for pickup',
      picked_up: 'Your shipment has been picked up',
      in_transit: 'Your shipment is in transit',
      out_for_delivery: 'Your shipment is out for delivery',
      delivered: 'Your shipment has been delivered',
      cancelled: 'Your shipment has been cancelled'
    };

    return this.createNotification({
      userId,
      type: 'shipment_status',
      message: statusMessages[status] || 'Your shipment status has been updated',
      data: {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        status
      }
    });
  }

  /**
   * Create draft expiry notification
   * @param {string} userId - User ID
   * @param {Object} draft - Draft shipment object
   * @returns {Promise<Object>} Created notification
   */
  async createDraftExpiryNotification(userId, draft) {
    return this.createNotification({
      userId,
      type: 'draft_expiry',
      data: {
        draftId: draft._id,
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
      }
    });
  }

  /**
   * Create pickup reminder notification
   * @param {string} userId - User ID
   * @param {Object} shipment - Shipment object
   * @returns {Promise<Object>} Created notification
   */
  async createPickupReminderNotification(userId, shipment) {
    return this.createNotification({
      userId,
      type: 'pickup_reminder',
      data: {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        pickupDate: shipment.pickup.date
      }
    });
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Notifications
   */
  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;

    const query = { userId };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification.markAsRead();
  }

  /**
   * Mark all notifications as read
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(userId) {
    return Notification.markAllAsRead(userId);
  }

  /**
   * Delete old notifications
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteOldNotifications(userId) {
    return Notification.deleteOldNotifications(userId);
  }

  /**
   * Get unread count
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(userId) {
    return Notification.getUnreadCount(userId);
  }
}

export default new NotificationService();
