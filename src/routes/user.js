import express from 'express';
import { body } from 'express-validator';
import {
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getSavedLocations,
  addSavedLocation,
  updateSavedLocation,
  deleteSavedLocation,
  getUserStats
} from '../controllers/user.js';
import { protect } from '../middleware/auth.js';
import { validate, commonValidations } from '../middleware/validate.js';

const router = express.Router();

// Profile update validation
const profileUpdateValidation = [
  body('firstName')
    .optional()
    .notEmpty().withMessage(commonValidations.name.notEmpty)
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .notEmpty().withMessage(commonValidations.name.notEmpty)
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .notEmpty().withMessage(commonValidations.phone.notEmpty)
    .matches(/^\+?[\d\s-()]{8,}$/).withMessage('Please provide a valid phone number'),
  body('country')
    .optional()
    .notEmpty().withMessage(commonValidations.country.notEmpty)
    .isISO31661Alpha2().withMessage(commonValidations.country.isISO31661Alpha2)
];

// Address validation
const addressValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim(),
  body('email')
    .notEmpty().withMessage(commonValidations.email.notEmpty)
    .isEmail().withMessage(commonValidations.email.isEmail),
  body('phone')
    .notEmpty().withMessage(commonValidations.phone.notEmpty)
    .matches(/^\+?[\d\s-()]{8,}$/).withMessage('Please provide a valid phone number'),
  body('address.street')
    .notEmpty().withMessage('Street address is required')
    .trim(),
  body('address.city')
    .notEmpty().withMessage('City is required')
    .trim(),
  body('address.country')
    .notEmpty().withMessage(commonValidations.country.notEmpty)
    .isISO31661Alpha2().withMessage(commonValidations.country.isISO31661Alpha2),
  body('address.postalCode')
    .notEmpty().withMessage(commonValidations.postalCode.notEmpty)
    .trim(),
  body('address.taxId')
    .optional()
    .trim()
];

// Saved location validation
const savedLocationValidation = [
  body('name')
    .notEmpty().withMessage('Location name is required')
    .trim()
    .isLength({ max: 100 }).withMessage('Location name cannot exceed 100 characters'),
  body('address.street')
    .notEmpty().withMessage('Street address is required')
    .trim(),
  body('address.city')
    .notEmpty().withMessage('City is required')
    .trim(),
  body('address.country')
    .notEmpty().withMessage(commonValidations.country.notEmpty)
    .isISO31661Alpha2().withMessage(commonValidations.country.isISO31661Alpha2),
  body('address.postalCode')
    .notEmpty().withMessage(commonValidations.postalCode.notEmpty)
    .trim(),
  body('address.taxId')
    .optional()
    .trim()
];

// Protect all routes
router.use(protect);

// Profile routes
router.put('/profile', validate(profileUpdateValidation), updateProfile);
router.get('/stats', getUserStats);

// Address routes
router.route('/addresses')
  .get(getAddresses)
  .post(validate(addressValidation), addAddress);

router.route('/addresses/:id')
  .put(validate(addressValidation), updateAddress)
  .delete(deleteAddress);

// Saved location routes
router.route('/saved-locations')
  .get(getSavedLocations)
  .post(validate(savedLocationValidation), addSavedLocation);

router.route('/saved-locations/:id')
  .put(validate(savedLocationValidation), updateSavedLocation)
  .delete(deleteSavedLocation);

export default router;
