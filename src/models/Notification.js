import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'payment_verification',
      'payment_confirmed',
      'payment_rejected',
      'shipment_status',
      'draft_expiry',
      'pickup_reminder',
      'delivery_update',
      'system_notification'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Methods
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Statics
notificationSchema.statics.createNotification = async function(data) {
  const notification = await this.create({
    ...data,
    expiresAt: data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
  });

  // Emit socket event if socket.io is set up
  if (global.io) {
    global.io.to(notification.userId.toString()).emit('notification', {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data
    });
  }

  return notification;
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, read: false });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, read: false },
    { 
      $set: { 
        read: true,
        readAt: new Date()
      }
    }
  );
};

notificationSchema.statics.deleteOldNotifications = function(userId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    userId,
    createdAt: { $lt: thirtyDaysAgo },
    read: true
  });
};

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Set expiry date if not set
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  next();
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
