import { asyncHandler, successResponse, AppError } from '../utils/responseHandler.js';
import paymentService from '../services/paymentService.js';
import Shipment from '../models/Shipment.js';
import { sanitizeData } from '../middleware/validate.js';

/**
 * @desc    Initialize bank transfer payment
 * @route   POST /api/payments/bank-transfer/initialize
 * @access  Private
 */
export const initializeBankTransfer = asyncHandler(async (req, res) => {
  const { shipmentId, accountName, bankName } = sanitizeData(req.body);

  // Get shipment
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) {
    throw new AppError('Shipment not found', 404);
  }

  // Check ownership
  if (shipment.userId && shipment.userId.toString() !== req.user.id) {
    throw new AppError('Not authorized to access this shipment', 403);
  }

  // Check if payment already exists
  if (shipment.payment && shipment.payment.status !== 'pending') {
    throw new AppError('Payment already initialized', 400);
  }

  const updatedShipment = await paymentService.initializeBankTransfer(shipment, {
    accountName,
    bankName
  });

  successResponse(res, 200, 'Bank transfer payment initialized', {
    shipment: updatedShipment
  });
});

/**
 * @desc    Verify bank transfer payment
 * @route   POST /api/payments/bank-transfer/verify/:shipmentId
 * @access  Private/Admin
 */
export const verifyBankTransfer = asyncHandler(async (req, res) => {
  const { verified, notes, rejectionReason } = sanitizeData(req.body);

  const updatedShipment = await paymentService.verifyBankTransfer(
    req.params.shipmentId,
    {
      verified,
      notes,
      rejectionReason,
      adminId: req.user.id
    }
  );

  successResponse(res, 200, 'Bank transfer payment verified', {
    shipment: updatedShipment
  });
});

/**
 * @desc    Process refund
 * @route   POST /api/payments/:shipmentId/refund
 * @access  Private/Admin
 */
export const processRefund = asyncHandler(async (req, res) => {
  const { reason, amount } = sanitizeData(req.body);

  const updatedShipment = await paymentService.processRefund(
    req.params.shipmentId,
    {
      reason,
      amount,
      adminId: req.user.id
    }
  );

  successResponse(res, 200, 'Refund processed successfully', {
    shipment: updatedShipment
  });
});

/**
 * @desc    Get payment status
 * @route   GET /api/payments/:shipmentId/status
 * @access  Private
 */
export const getPaymentStatus = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.shipmentId);
  if (!shipment) {
    throw new AppError('Shipment not found', 404);
  }

  // Check ownership
  if (shipment.userId && shipment.userId.toString() !== req.user.id) {
    throw new AppError('Not authorized to access this shipment', 403);
  }

  const paymentStatus = await paymentService.getPaymentStatus(req.params.shipmentId);

  successResponse(res, 200, 'Payment status retrieved', {
    payment: paymentStatus
  });
});

/**
 * @desc    Get pending bank transfers
 * @route   GET /api/payments/bank-transfer/pending
 * @access  Private/Admin
 */
export const getPendingBankTransfers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const pendingPayments = await Shipment.find({
    'payment.method': 'bank_transfer',
    'payment.status': 'awaiting_verification'
  })
    .populate('userId', 'firstName lastName email')
    .sort({ 'payment.createdAt': -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Shipment.countDocuments({
    'payment.method': 'bank_transfer',
    'payment.status': 'awaiting_verification'
  });

  successResponse(res, 200, 'Pending bank transfers retrieved', {
    payments: pendingPayments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get payment history
 * @route   GET /api/payments/history
 * @access  Private
 */
export const getPaymentHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const status = req.query.status;

  const query = { userId: req.user.id };
  if (status) {
    query['payment.status'] = status;
  }

  const payments = await Shipment.find(query)
    .select('trackingNumber payment cost createdAt')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Shipment.countDocuments(query);

  successResponse(res, 200, 'Payment history retrieved', {
    payments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get payment statistics
 * @route   GET /api/payments/stats
 * @access  Private/Admin
 */
export const getPaymentStats = asyncHandler(async (req, res) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(0);
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

  const stats = await Shipment.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        'payment.status': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$payment.status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$cost.total' }
      }
    }
  ]);

  const totalPayments = await Shipment.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
    'payment.status': { $exists: true }
  });

  const totalAmount = stats.reduce((acc, curr) => acc + curr.totalAmount, 0);

  successResponse(res, 200, 'Payment statistics retrieved', {
    stats,
    summary: {
      totalPayments,
      totalAmount
    },
    dateRange: {
      startDate,
      endDate
    }
  });
});
