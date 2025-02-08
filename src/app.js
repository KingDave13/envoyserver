import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import connectDB from './config/db.js';
import socketService from './services/socketService.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import shipmentRoutes from './routes/shipment.js';
import notificationRoutes from './routes/notification.js';
import cleanupDrafts from './scripts/cleanupDrafts.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);

// Set up Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize socket service
socketService.initialize(io);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));

// Rate limiting
const standardLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000, // Convert minutes to milliseconds
  max: parseInt(process.env.RATE_LIMIT_MAX),
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  }
});

// More lenient rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  }
});

// Apply rate limiting
app.use('/api/auth', authLimiter); // Auth routes get more lenient limit
app.use(standardLimiter); // All other routes get standard limit

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
app.use(cookieParser());

// Logger middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/notifications', notificationRoutes);

// API documentation route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Envoy Angel API',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    documentation: `${process.env.CLIENT_URL}/api-docs`,
    healthCheck: `${process.env.SERVER_URL}/health`
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: Object.values(err.errors).map(val => val.message)
    });
  }

  // Handle mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size cannot exceed 10MB'
    });
  }

  // Handle other errors
  res.status(err.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server Error'
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// Schedule draft cleanup cron job (every day at midnight)
cron.schedule('0 0 * * *', () => {
  console.log('Running draft cleanup...');
  cleanupDrafts().catch(console.error);
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Server URL: ${process.env.SERVER_URL}`);
  console.log(`Client URL: ${process.env.CLIENT_URL}`);
  console.log('Socket.IO server initialized');
});

export default app;
