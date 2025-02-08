import mongoose from 'mongoose';
import { generateTrackingNumber } from '../utils/trackingNumber.js';

const addressSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      uppercase: true
    },
    postalCode: {
      type: String,
      trim: true
    },
    taxId: {
      type: String,
      trim: true
    }
  }
});

const dimensionsSchema = new mongoose.Schema({
  length: {
    type: Number
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  }
});

const packageSchema = new mongoose.Schema({
  packageType: {
    type: String,
    enum: ['parcel', 'documents', 'pallet', 'container', 'other']
  },
  weight: {
    type: Number
  },
  dimensions: {
    type: dimensionsSchema
  },
  description: {
    type: String,
    trim: true
  },
  isFragile: {
    type: Boolean,
    default: false
  },
  isPerishable: {
    type: Boolean,
    default: false
  },
  isHazardous: {
    type: Boolean,
    default: false
  },
  specialInstructions: {
    type: String,
    trim: true
  }
});

const timelineEntrySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: [
      'pending',
      'awaiting_pickup',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ]
  },
  location: String,
  description: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const costSchema = new mongoose.Schema({
  baseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  insurance: {
    type: Number,
    default: 0,
    min: 0
  },
  vat: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const paymentSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: String,
  paidAt: Date,
  refundReason: String
});

const shipmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  trackingNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  type: {
    type: String,
    required: [true, 'Shipment type is required'],
    enum: ['international', 'local']
  },
  status: {
    type: String,
    enum: [
      'pending',
      'awaiting_pickup',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ],
    default: 'pending'
  },
  sender: {
    type: addressSchema
  },
  recipient: {
    type: addressSchema
  },
  packages: {
    type: [packageSchema]
  },
  pickup: {
    location: {
      type: {
        street: String,
        city: String,
        country: {
          type: String,
          uppercase: true
        },
        postalCode: String
      }
    },
    date: {
      type: Date
    },
    instructions: String
  },
  delivery: {
    estimatedDate: Date,
    actualDate: Date,
    options: {
      timeWindow: {
        start: Date,
        end: Date
      },
      specialInstructions: String,
      requiresSignature: {
        type: Boolean,
        default: true
      }
    }
  },
  insurance: {
    type: {
      type: String,
      enum: ['none', 'basic', 'premium'],
      default: 'none'
    },
    coverage: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  cost: {
    type: costSchema
  },
  payment: {
    type: paymentSchema,
    default: {}
  },
  timeline: [timelineEntrySchema],
  isDraft: {
    type: Boolean,
    default: false
  },
  lastSavedStep: {
    type: Number,
    min: 1,
    max: 7
  }
}, {
  timestamps: true
});

// Generate tracking number before saving
shipmentSchema.pre('save', async function(next) {
  if (!this.trackingNumber && !this.isDraft) {
    this.trackingNumber = await generateTrackingNumber(this.type);
  }
  next();
});

// Add timeline entry method
shipmentSchema.methods.addTimelineEntry = async function(status, location, description) {
  this.timeline.push({
    status,
    location,
    description
  });
  this.status = status;
  return this.save();
};

// Get estimated delivery date
shipmentSchema.methods.getEstimatedDeliveryDate = function() {
  return this.delivery.estimatedDate;
};

// Get shipment age in days
shipmentSchema.methods.getShipmentAge = function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
};

// Check if shipment is overdue
shipmentSchema.methods.isOverdue = function() {
  if (!this.delivery.estimatedDate) return false;
  return Date.now() > this.delivery.estimatedDate && this.status !== 'delivered';
};

// Get latest timeline entry
shipmentSchema.methods.getLatestTimelineEntry = function() {
  return this.timeline[this.timeline.length - 1];
};

// Check if shipment can be cancelled
shipmentSchema.methods.canBeCancelled = function() {
  const nonCancellableStatuses = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'];
  return !nonCancellableStatuses.includes(this.status);
};

// Indexes
shipmentSchema.index({ userId: 1, createdAt: -1 });
shipmentSchema.index({ trackingNumber: 1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ 'sender.email': 1 });
shipmentSchema.index({ 'recipient.email': 1 });
shipmentSchema.index({ isDraft: 1, lastSavedStep: 1 });

const Shipment = mongoose.model('Shipment', shipmentSchema);

export default Shipment;
