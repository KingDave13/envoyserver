import { asyncHandler, successResponse, AppError } from '../utils/responseHandler.js';
import Shipment from '../models/Shipment.js';
import User from '../models/User.js';
import emailService from '../utils/email.js';
import shipmentService from '../services/shipmentService.js';
import { sanitizeData } from '../middleware/validate.js';

/**
 * @desc    Save shipment draft
 * @route   POST /api/shipments/draft
 * @access  Private
 */
export const saveShipmentDraft = asyncHandler(async (req, res) => {
  const sanitizedData = sanitizeData(req.body);
  const { step, formData } = sanitizedData;

  let shipment;
  if (formData._id) {
    shipment = await Shipment.findById(formData._id);
    // Check ownership only if the shipment has a userId and current user is different
    if (shipment && shipment.userId && (!req.user || shipment.userId.toString() !== req.user.id)) {
      throw new AppError('Not authorized to modify this shipment', 403);
    }
  }

  const shipmentData = {
    ...formData,
    isDraft: true,
    lastSavedStep: step
  };

  // Only add userId if user is authenticated
  if (req.user) {
    shipmentData.userId = req.user.id;
  }

  if (shipment) {
    Object.assign(shipment, shipmentData);
    await shipment.save();
  } else {
    shipment = await Shipment.create(shipmentData);
  }

  successResponse(res, 200, 'Draft saved successfully', { shipment });
});

/**
 * @desc    Get shipment draft
 * @route   GET /api/shipments/draft/:id
 * @access  Private
 */
export const getShipmentDraft = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({
    _id: req.params.id,
    isDraft: true
  });

  if (!shipment) {
    throw new AppError('Draft not found', 404);
  }

  // Check ownership only if the shipment has a userId and current user is different
  if (shipment.userId && (!req.user || shipment.userId.toString() !== req.user.id)) {
    throw new AppError('Not authorized to access this draft', 403);
  }

  successResponse(res, 200, 'Draft retrieved successfully', { shipment });
});

/**
 * @desc    Calculate shipping cost
 * @route   POST /api/shipments/calculate-cost
 * @access  Public
 */
export const calculateCost = asyncHandler(async (req, res) => {
  const sanitizedData = sanitizeData(req.body);

  // Validate packages
  shipmentService.validatePackages(sanitizedData.packages);

  // Calculate costs
  const cost = shipmentService.calculateShippingCost(sanitizedData);

  successResponse(res, 200, 'Shipping cost calculated', { cost });
});

/**
 * @desc    Create new shipment
 * @route   POST /api/shipments
 * @access  Private
 */
export const createShipment = asyncHandler(async (req, res) => {
  const sanitizedData = sanitizeData(req.body);

  // Validate addresses
  shipmentService.validateAddresses(sanitizedData);

  // Validate packages
  shipmentService.validatePackages(sanitizedData.packages);

  // Validate pickup date
  shipmentService.validatePickupDate(sanitizedData.pickup.date);

  // Calculate costs
  const cost = shipmentService.calculateShippingCost(sanitizedData);

  // Estimate delivery date
  const estimatedDate = shipmentService.estimateDeliveryDate(sanitizedData);

  // Create shipment
  const shipmentData = {
    ...sanitizedData,
    cost,
    delivery: {
      ...sanitizedData.delivery,
      estimatedDate
    },
    isDraft: false
  };

  // Only add userId if user is authenticated
  if (req.user) {
    shipmentData.userId = req.user.id;
  }

  const shipment = await Shipment.create(shipmentData);

  // Add initial timeline entry
  const statusUpdate = shipmentService.formatStatusUpdate('pending');
  await shipment.addTimelineEntry(
    statusUpdate.status,
    null,
    statusUpdate.description
  );

  // Send confirmation email
  // For guest shipments, use the sender's email
  // For authenticated users, use their account email
  if (req.user) {
    await emailService.sendShipmentConfirmation(shipment, req.user);
  } else {
    await emailService.sendGuestShipmentConfirmation(shipment, shipmentData.sender.email);
  }

  successResponse(res, 201, 'Shipment created successfully', { shipment });
});

/**
 * @desc    Get all user shipments
 * @route   GET /api/shipments
 * @access  Private
 */
export const getShipments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const status = req.query.status;
  const type = req.query.type;

  const query = { 
    userId: req.user.id,
    isDraft: false
  };
  if (status) query.status = status;
  if (type) query.type = type;

  const shipments = await Shipment.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Shipment.countDocuments(query);

  successResponse(res, 200, 'Shipments retrieved successfully', {
    shipments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Update package details
 * @route   PUT /api/shipments/:id/package
 * @access  Public/Private
 */
export const updatePackageDetails = asyncHandler(async (req, res) => {
  const sanitizedData = sanitizeData(req.body);
  const shipment = await Shipment.findById(req.params.id);

  if (!shipment) {
    throw new AppError('Shipment not found', 404);
  }

  // Update package details
  shipment.packages = sanitizedData.packages;
  await shipment.save();

  successResponse(res, 200, 'Package details updated successfully', { shipment });
});

/**
 * @desc    Update delivery options
 * @route   PUT /api/shipments/:id/delivery
 * @access  Public/Private
 */
export const updateDeliveryOptions = asyncHandler(async (req, res) => {
  const sanitizedData = sanitizeData(req.body);
  const shipment = await Shipment.findById(req.params.id);

  if (!shipment) {
    throw new AppError('Shipment not found', 404);
  }

  // Update delivery options
  shipment.delivery = {
    ...shipment.delivery,
    ...sanitizedData.delivery
  };
  await shipment.save();

  successResponse(res, 200, 'Delivery options updated successfully', { shipment });
});

/**
 * @desc    Update sender information
 * @route   PUT /api/shipments/:id/sender
 * @access  Public/Private
 */
export const updateSenderInfo = asyncHandler(async (req, res) => {
  const sanitizedData = sanitizeData(req.body);
  const shipment = await Shipment.findById(req.params.id);

  if (!shipment) {
    throw new AppError('Shipment not found', 404);
  }

  // Update sender information
  shipment.sender = sanitizedData.sender;
  await shipment.save();

  successResponse(res, 200, 'Sender information updated successfully', { shipment });
});

/**
 * @desc    Update recipient information
 * @route   PUT /api/shipments/:id/recipient
 * @access  Public/Private
 */
export const updateRecipientInfo = asyncHandler(async (req, res) => {
  const sanitizedData = sanitizeData(req.body);
  const shipment = await Shipment.findById(req.params.id);

  if (!shipment) {
    throw new AppError('Shipment not found', 404);
  }

  // Update recipient information
  shipment.recipient = sanitizedData.recipient;
  await shipment.save();

  successResponse(res, 200, 'Recipient information updated successfully', { shipment });
});

/**
 * @desc    Update pickup location
 * @route   PUT /api/shipments/:id/pickup
 * @access  Public/Private
 */
export const updatePickupLocation = asyncHandler(async (req, res) => {
  const sanitizedData = sanitizeData(req.body);
  const shipment = await Shipment.findById(req.params.id);

  if (!shipment) {
    throw new AppError('Shipment not found', 404);
  }

  // Update pickup location
  shipment.pickup = sanitizedData.pickup;
  await shipment.save();

  successResponse(res, 200, 'Pickup location updated successfully', { shipment });
});

/**
 * @desc    Update insurance
 * @route   PUT /api/shipments/:id/insurance
 * @access  Public/Private
 */
export const updateInsurance = asyncHandler(async (req, res) => {
  const sanitizedData = sanitizeData(req.body);
  const shipment = await Shipment.findById(req.params.id);

  if (!shipment) {
    throw new AppError('Shipment not found', 404);
  }

  // Update insurance
  shipment.insurance = sanitizedData.insurance;
  await shipment.save();

  successResponse(res, 200, 'Insurance updated successfully', { shipment });
});

/**
 * @desc    Initialize shipment
 * @route   POST /api/shipments/initialize
 * @access  Public
 */
export const initializeShipment = asyncHandler(async (req, res) => {
  const sanitizedData = sanitizeData(req.body);

  // Create initial shipment data
  const shipmentData = {
    type: sanitizedData.shipmentType,
    isDraft: true,
    status: 'pending',
    lastSavedStep: 1,
    sender: {
      address: {
        country: sanitizedData.origin.country,
        city: sanitizedData.origin.city
      }
    },
    recipient: {
      address: {
        country: sanitizedData.destination.country,
        city: sanitizedData.destination.city
      }
    }
  };

  // Only add userId if user is authenticated
  if (req.user) {
    shipmentData.userId = req.user.id;
  }

  // Create shipment
  const shipment = await Shipment.create(shipmentData);

  successResponse(res, 201, 'Shipment initialized successfully', { shipment });
});

/**
 * @desc    Get shipment by ID
 * @route   GET /api/shipments/:id
 * @access  Private
 */
export const getShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({
    _id: req.params.id,
    isDraft: false
  });

  if (!shipment) {
    throw new AppError('Shipment not found', 404);
  }

  // Check ownership if not a guest shipment
  if (shipment.userId && shipment.userId.toString() !== req.user?.id && req.user?.role !== 'admin') {
    throw new AppError('Not authorized to access this shipment', 403);
  }

  successResponse(res, 200, 'Shipment retrieved successfully', { shipment });
});

/**
 * @desc    Track shipment
 * @route   GET /api/shipments/track/:trackingNumber
 * @access  Public
 */
export const trackShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({
    trackingNumber: req.params.trackingNumber,
    isDraft: false
  }).select('trackingNumber status timeline type sender.address recipient.address delivery packages');

  if (!shipment) {
    throw new AppError('Invalid tracking number', 404);
  }

  successResponse(res, 200, 'Shipment tracking information retrieved', { shipment });
});

/**
 * @desc    Update shipment status
 * @route   PUT /api/shipments/:id/status
 * @access  Private/Admin
 */
export const updateShipmentStatus = asyncHandler(async (req, res) => {
  const { status, location, description } = sanitizeData(req.body);

  const shipment = await Shipment.findOne({
    _id: req.params.id,
    isDraft: false
  });

  if (!shipment) {
    throw new AppError('Shipment not found', 404);
  }

  shipment.status = status;
  if (status === 'delivered') {
    shipment.delivery.actualDate = Date.now();
  }

  // Add timeline entry
  const statusUpdate = shipmentService.formatStatusUpdate(status);
  await shipment.addTimelineEntry(
    status,
    location,
    description || statusUpdate.description
  );

  // Send status update email if user exists
  if (shipment.userId) {
    const user = await User.findById(shipment.userId);
    if (user) {
      await emailService.sendStatusUpdateEmail(shipment, user);
    }
  }

  successResponse(res, 200, 'Shipment status updated successfully', { shipment });
});

/**
 * @desc    Get shipment statistics
 * @route   GET /api/shipments/stats
 * @access  Private
 */
export const getShipmentStats = asyncHandler(async (req, res) => {
  const stats = await Shipment.aggregate([
    {
      $match: { 
        userId: req.user._id,
        isDraft: false
      }
    },
    {
      $group: {
        _id: null,
        totalShipments: { $sum: 1 },
        activeShipments: {
          $sum: {
            $cond: [
              { $in: ['$status', ['pending', 'awaiting_pickup', 'picked_up', 'in_transit', 'out_for_delivery']] },
              1,
              0
            ]
          }
        },
        completedShipments: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        totalSpent: { $sum: '$cost.total' }
      }
    }
  ]);

  const monthlyStats = await Shipment.aggregate([
    {
      $match: { 
        userId: req.user._id,
        isDraft: false
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 },
        total: { $sum: '$cost.total' }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    },
    {
      $limit: 12
    }
  ]);

  successResponse(res, 200, 'Shipment statistics retrieved', {
    overview: stats[0] || {
      totalShipments: 0,
      activeShipments: 0,
      completedShipments: 0,
      totalSpent: 0
    },
    monthly: monthlyStats
  });
});
