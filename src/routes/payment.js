import express from 'express';
import { body, query } from 'express-validator';
import {
  initializeBankTransfer,
  verifyBankTransfer,
  processRefund,
  getPaymentStatus,
  getPendingBankTransfers,
  getPaymentHistory,
  getPaymentStats
} from '../controllers/payment.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Bank transfer validation
const bankTransferValidation = [
  body('shipmentId')
    .notEmpty().withMessage('Shipment ID is required')
    .isMongoId().withMessage('Invalid shipment ID'),
  body('accountName')
    .notEmpty().withMessage('Account name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Account name must be between 2 and 100 characters'),
  body('bankName')
    .notEmpty().withMessage('Bank name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Bank name must be between 2 and 100 characters')
];

// Verification validation
const verificationValidation = [
  body('verified')
    .notEmpty().withMessage('Verification status is required')
    .isBoolean().withMessage('Verification status must be a boolean'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('rejectionReason')
    .if(body('verified').equals('false'))
    .notEmpty().withMessage('Rejection reason is required when verification fails')
    .trim()
    .isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters')
];

// Refund validation
const refundValidation = [
  body('reason')
    .notEmpty().withMessage('Refund reason is required')
    .trim()
    .isLength({ max: 500 }).withMessage('Refund reason cannot exceed 500 characters'),
  body('amount')
    .optional()
    .isNumeric().withMessage('Amount must be a number')
    .custom((value) => value > 0).withMessage('Amount must be greater than 0')
];

// Query validation
const historyQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'awaiting_verification', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid payment status')
];

const statsQueryValidation = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

// Protect all routes
router.use(protect);

// Bank transfer routes
router.post(
  '/bank-transfer/initialize',
  validate(bankTransferValidation),
  initializeBankTransfer
);

router.post(
  '/bank-transfer/verify/:shipmentId',
  authorize('admin'),
  validate(verificationValidation),
  verifyBankTransfer
);

router.get(
  '/bank-transfer/pending',
  authorize('admin'),
  validate(historyQueryValidation),
  getPendingBankTransfers
);

// Payment status route
router.get(
  '/:shipmentId/status',
  getPaymentStatus
);

// Refund route
router.post(
  '/:shipmentId/refund',
  authorize('admin'),
  validate(refundValidation),
  processRefund
);

// Payment history route
router.get(
  '/history',
  validate(historyQueryValidation),
  getPaymentHistory
);

// Payment statistics route
router.get(
  '/stats',
  authorize('admin'),
  validate(statsQueryValidation),
  getPaymentStats
);

export default router;
