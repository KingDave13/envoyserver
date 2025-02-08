class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // Map of userId -> Set of socket IDs
  }

  /**
   * Initialize Socket.IO instance
   * @param {Object} io - Socket.IO instance
   */
  initialize(io) {
    this.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle user joining their room
      socket.on('join', (userId) => {
        if (userId) {
          socket.join(userId);
          this.addUserSocket(userId, socket.id);
          console.log(`User ${userId} joined their room`);
        }
      });

      // Handle user leaving
      socket.on('disconnect', () => {
        this.removeSocket(socket.id);
        console.log('Client disconnected:', socket.id);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  /**
   * Add user socket mapping
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   */
  addUserSocket(userId, socketId) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);
  }

  /**
   * Remove socket mapping
   * @param {string} socketId - Socket ID
   */
  removeSocket(socketId) {
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(socketId)) {
        sockets.delete(socketId);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  /**
   * Get user's socket IDs
   * @param {string} userId - User ID
   * @returns {Set<string>} Set of socket IDs
   */
  getUserSockets(userId) {
    return this.userSockets.get(userId) || new Set();
  }

  /**
   * Check if user is online
   * @param {string} userId - User ID
   * @returns {boolean} Whether user is online
   */
  isUserOnline(userId) {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  /**
   * Send notification to user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   */
  sendNotification(userId, notification) {
    if (this.io && userId) {
      this.io.to(userId).emit('notification', notification);
    }
  }

  /**
   * Send shipment status update
   * @param {string} userId - User ID
   * @param {Object} shipment - Shipment object
   */
  sendShipmentUpdate(userId, shipment) {
    if (this.io && userId) {
      this.io.to(userId).emit('shipment_update', {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send payment status update
   * @param {string} userId - User ID
   * @param {Object} payment - Payment object
   */
  sendPaymentUpdate(userId, payment) {
    if (this.io && userId) {
      this.io.to(userId).emit('payment_update', {
        shipmentId: payment.shipmentId,
        status: payment.status,
        transactionId: payment.transactionId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send draft expiry warning
   * @param {string} userId - User ID
   * @param {Object} draft - Draft shipment object
   */
  sendDraftExpiryWarning(userId, draft) {
    if (this.io && userId) {
      this.io.to(userId).emit('draft_expiry_warning', {
        draftId: draft._id,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        timestamp: new Date()
      });
    }
  }

  /**
   * Send pickup reminder
   * @param {string} userId - User ID
   * @param {Object} shipment - Shipment object
   */
  sendPickupReminder(userId, shipment) {
    if (this.io && userId) {
      this.io.to(userId).emit('pickup_reminder', {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        pickupDate: shipment.pickup.date,
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast system notification to all users
   * @param {Object} notification - Notification object
   */
  broadcastSystemNotification(notification) {
    if (this.io) {
      this.io.emit('system_notification', {
        ...notification,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send error notification
   * @param {string} userId - User ID
   * @param {string} message - Error message
   */
  sendErrorNotification(userId, message) {
    if (this.io && userId) {
      this.io.to(userId).emit('error_notification', {
        message,
        timestamp: new Date()
      });
    }
  }
}

export default new SocketService();
