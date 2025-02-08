import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

/**
 * Create admin user
 */
const createAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      firstName: process.env.ADMIN_FIRST_NAME,
      lastName: process.env.ADMIN_LAST_NAME,
      phone: process.env.ADMIN_PHONE || '+2348000000000', // Default phone number
      country: process.env.ADMIN_COUNTRY || 'NG', // Default to Nigeria
      role: 'admin',
      isVerified: true
    });

    console.log('Admin user created successfully:', {
      id: admin._id,
      email: admin.email,
      name: `${admin.firstName} ${admin.lastName}`,
      role: admin.role
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

// Run the script
createAdmin();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
