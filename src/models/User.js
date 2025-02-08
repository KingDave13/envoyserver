import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    minlength: [2, 'Country code must be 2 characters'],
    maxlength: [2, 'Country code must be 2 characters'],
    uppercase: true
  },
  postalCode: {
    type: String,
    required: [true, 'Postal code is required'],
    trim: true
  },
  taxId: {
    type: String,
    trim: true
  }
});

const savedLocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    maxlength: [100, 'Location name cannot exceed 100 characters']
  },
  address: {
    type: addressSchema,
    required: [true, 'Address is required']
  }
});

const settingsSchema = new mongoose.Schema({
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    payment_verification: {
      type: Boolean,
      default: true
    },
    payment_confirmed: {
      type: Boolean,
      default: true
    },
    shipment_status: {
      type: Boolean,
      default: true
    },
    draft_expiry: {
      type: Boolean,
      default: true
    },
    pickup_reminder: {
      type: Boolean,
      default: true
    }
  },
  preferences: {
    language: {
      type: String,
      enum: ['en', 'fr', 'es'],
      default: 'en'
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'NGN'],
      default: 'NGN'
    },
    timezone: {
      type: String,
      default: 'Africa/Lagos'
    }
  }
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters long'],
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters long'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    minlength: [2, 'Country code must be 2 characters'],
    maxlength: [2, 'Country code must be 2 characters'],
    uppercase: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  passwordChangedAt: Date,
  lastLogin: Date,
  addresses: [addressSchema],
  savedLocations: [savedLocationSchema],
  settings: {
    type: settingsSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  if (this.isModified('password') && !this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }

  next();
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Generate verification token
userSchema.methods.generateVerificationToken = function() {
  // Generate token
  const token = crypto.randomBytes(32).toString('hex');

  // Hash token and set to verificationToken field
  this.verificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Set expire
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return token;
};

// Generate password reset token
userSchema.methods.generateResetPasswordToken = function() {
  // Generate token
  const token = crypto.randomBytes(32).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Set expire
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour

  return token;
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index for email lookups
userSchema.index({ email: 1 });

// Index for verification token lookups
userSchema.index({ verificationToken: 1, verificationTokenExpires: 1 });

// Index for password reset token lookups
userSchema.index({ resetPasswordToken: 1, resetPasswordExpires: 1 });

const User = mongoose.model('User', userSchema);

export default User;
