import express from 'express';
import { body } from 'express-validator';
import {
  createShipment,
  getShipments,
  getShipment,
  trackShipment,
  updateShipmentStatus,
  calculateCost,
  getShipmentStats,
  saveShipmentDraft,
  getShipmentDraft,
  initializeShipment,
  updatePackageDetails,
  updateDeliveryOptions,
  updateSenderInfo,
  updateRecipientInfo,
  updatePickupLocation,
  updateInsurance
} from '../controllers/shipment.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import { validate, commonValidations } from '../middleware/validate.js';

const router = express.Router();

// Contact validation schema generator
const createContactValidation = (prefix) => [
  body(`${prefix}.name`)
    .notEmpty().withMessage(commonValidations.name.notEmpty)
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body(`${prefix}.email`)
    .notEmpty().withMessage(commonValidations.email.notEmpty)
    .isEmail().withMessage(commonValidations.email.isEmail),
  body(`${prefix}.phone`)
    .notEmpty().withMessage(commonValidations.phone.notEmpty),
  body(`${prefix}.address.street`)
    .notEmpty().withMessage('Street is required'),
  body(`${prefix}.address.city`)
    .notEmpty().withMessage('City is required'),
  body(`${prefix}.address.country`)
    .notEmpty().withMessage(commonValidations.country.notEmpty)
    .isISO31661Alpha2().withMessage(commonValidations.country.isISO31661Alpha2),
  body(`${prefix}.address.postalCode`)
    .notEmpty().withMessage(commonValidations.postalCode.notEmpty),
  body(`${prefix}.address.taxId`)
    .optional()
    .notEmpty().withMessage('Tax ID cannot be empty if provided')
];

// Package validation schema generator
const createPackageValidation = (prefix = '') => [
  body(`${prefix}packageType`)
    .notEmpty().withMessage('Package type is required')
    .isIn(['parcel', 'documents', 'pallet', 'container', 'other'])
    .withMessage('Invalid package type'),
  body(`${prefix}weight`)
    .notEmpty().withMessage(commonValidations.weight.notEmpty)
    .isNumeric().withMessage(commonValidations.weight.isNumeric)
    .isFloat({ min: 0.1 }).withMessage(commonValidations.weight.min),
  body(`${prefix}dimensions.length`)
    .notEmpty().withMessage(commonValidations.dimensions.notEmpty)
    .isNumeric().withMessage(commonValidations.dimensions.isNumeric)
    .isFloat({ min: 1, max: 150 }).withMessage('Length must be between 1 and 150 cm'),
  body(`${prefix}dimensions.width`)
    .notEmpty().withMessage(commonValidations.dimensions.notEmpty)
    .isNumeric().withMessage(commonValidations.dimensions.isNumeric)
    .isFloat({ min: 1, max: 150 }).withMessage('Width must be between 1 and 150 cm'),
  body(`${prefix}dimensions.height`)
    .notEmpty().withMessage(commonValidations.dimensions.notEmpty)
    .isNumeric().withMessage(commonValidations.dimensions.isNumeric)
    .isFloat({ min: 1, max: 150 }).withMessage('Height must be between 1 and 150 cm'),
  body(`${prefix}isFragile`).optional().isBoolean(),
  body(`${prefix}isPerishable`).optional().isBoolean(),
  body(`${prefix}isHazardous`).optional().isBoolean(),
  body(`${prefix}description`).optional().isString().trim()
];

// Draft validation schema
const draftValidation = [
  body('step')
    .notEmpty().withMessage('Step number is required')
    .isInt({ min: 1, max: 7 }).withMessage('Invalid step number'),
  body('formData').isObject().withMessage('Form data is required')
];

// Shipment creation validation
const createShipmentValidation = [
  body('type')
    .notEmpty().withMessage(commonValidations.shipmentType.notEmpty)
    .isIn(['international', 'local']).withMessage(commonValidations.shipmentType.isIn),
  body('sender').isObject().withMessage('Sender information is required'),
  ...createContactValidation('sender'),
  body('recipient').isObject().withMessage('Recipient information is required'),
  ...createContactValidation('recipient'),
  body('packages')
    .isArray({ min: 1, max: 10 }).withMessage('At least one package is required (max 10)'),
  body('packages.*').isObject().withMessage('Invalid package data'),
  ...createPackageValidation('packages.*.'),
  body('pickup.location').isObject().withMessage('Pickup location is required'),
  body('pickup.location.street').notEmpty().withMessage('Pickup street is required'),
  body('pickup.location.city').notEmpty().withMessage('Pickup city is required'),
  body('pickup.location.country')
    .notEmpty().withMessage('Pickup country is required')
    .isISO31661Alpha2().withMessage('Invalid pickup country code'),
  body('pickup.location.postalCode').notEmpty().withMessage('Pickup postal code is required'),
  body('pickup.date')
    .notEmpty().withMessage(commonValidations.date.notEmpty)
    .isISO8601().withMessage(commonValidations.date.isDate),
  body('delivery.options').optional().isObject(),
  body('delivery.options.timeWindow').optional().isObject(),
  body('delivery.options.timeWindow.start').optional().isISO8601(),
  body('delivery.options.timeWindow.end').optional().isISO8601(),
  body('delivery.options.specialInstructions').optional().isString(),
  body('delivery.options.requiresSignature').optional().isBoolean(),
  body('insurance.type')
    .optional()
    .isIn(['none', 'basic', 'premium']).withMessage('Invalid insurance type'),
  body('insurance.coverage')
    .optional()
    .isFloat({ min: 0 }).withMessage('Coverage amount must be non-negative')
];

// Initialize shipment validation
const initializeShipmentValidation = [
  body('shipmentType')
    .isIn(['international', 'local']).withMessage('Invalid shipment type'),
  body('origin').isObject(),
  body('destination').isObject()
];

// Cost calculation validation
const calculateCostValidation = [
  body('type')
    .notEmpty().withMessage(commonValidations.shipmentType.notEmpty)
    .isIn(['international', 'local']).withMessage(commonValidations.shipmentType.isIn),
  body('packages')
    .isArray({ min: 1, max: 10 }).withMessage('At least one package is required (max 10)'),
  body('packages.*').isObject().withMessage('Invalid package data'),
  ...createPackageValidation('packages.*.'),
  body('insurance.type')
    .optional()
    .isIn(['none', 'basic', 'premium']).withMessage('Invalid insurance type')
];

// Status update validation
const updateStatusValidation = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn([
      'pending',
      'awaiting_pickup',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ]).withMessage('Invalid status'),
  body('location').optional().notEmpty().withMessage('Location cannot be empty if provided'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty if provided')
];

// Public routes
router.get('/track/:trackingNumber', trackShipment);
router.post('/calculate-cost', validate(calculateCostValidation), calculateCost);

// Routes that work with or without auth
router.post('/initialize', optionalAuth, validate(initializeShipmentValidation), initializeShipment);
router.post('/', optionalAuth, validate(createShipmentValidation), createShipment);
router.get('/:id', optionalAuth, getShipment);
router.post('/draft', optionalAuth, validate(draftValidation), saveShipmentDraft);
router.get('/draft/:id', optionalAuth, getShipmentDraft);

// Package update routes
router.put('/:id/package', optionalAuth, updatePackageDetails);
router.put('/:id/delivery', optionalAuth, updateDeliveryOptions);
router.put('/:id/sender', optionalAuth, updateSenderInfo);
router.put('/:id/recipient', optionalAuth, updateRecipientInfo);
router.put('/:id/pickup', optionalAuth, updatePickupLocation);
router.put('/:id/insurance', optionalAuth, updateInsurance);

// Protected routes (require login)
router.use(protect);
router.get('/', getShipments);
router.get('/stats', getShipmentStats);

// Admin only routes
router.put('/:id/status', authorize('admin'), validate(updateStatusValidation), updateShipmentStatus);

export default router;
