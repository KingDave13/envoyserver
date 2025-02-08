import { asyncHandler, successResponse, AppError } from '../utils/responseHandler.js';
import User from '../models/User.js';
import { sanitizeData } from '../middleware/validate.js';

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['firstName', 'lastName', 'phone', 'country'];
  const updateData = {};

  // Filter allowed fields
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = req.body[key];
    }
  });

  const sanitizedData = sanitizeData(updateData);

  const user = await User.findByIdAndUpdate(
    req.user.id,
    sanitizedData,
    {
      new: true,
      runValidators: true
    }
  );

  successResponse(res, 200, 'Profile updated successfully', { user });
});

/**
 * @desc    Get user addresses
 * @route   GET /api/users/addresses
 * @access  Private
 */
export const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  successResponse(res, 200, 'Addresses retrieved successfully', {
    addresses: user.addresses
  });
});

/**
 * @desc    Add user address
 * @route   POST /api/users/addresses
 * @access  Private
 */
export const addAddress = asyncHandler(async (req, res) => {
  const addressData = sanitizeData(req.body);

  const user = await User.findById(req.user.id);

  // Check if maximum addresses limit reached
  if (user.addresses.length >= 10) {
    throw new AppError('Maximum number of addresses (10) reached', 400);
  }

  user.addresses.push(addressData);
  await user.save();

  successResponse(res, 201, 'Address added successfully', {
    address: user.addresses[user.addresses.length - 1]
  });
});

/**
 * @desc    Update user address
 * @route   PUT /api/users/addresses/:id
 * @access  Private
 */
export const updateAddress = asyncHandler(async (req, res) => {
  const addressData = sanitizeData(req.body);

  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.id);

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  // Update address fields
  Object.assign(address, addressData);
  await user.save();

  successResponse(res, 200, 'Address updated successfully', { address });
});

/**
 * @desc    Delete user address
 * @route   DELETE /api/users/addresses/:id
 * @access  Private
 */
export const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.id);

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  address.remove();
  await user.save();

  successResponse(res, 200, 'Address deleted successfully');
});

/**
 * @desc    Get saved locations
 * @route   GET /api/users/saved-locations
 * @access  Private
 */
export const getSavedLocations = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  successResponse(res, 200, 'Saved locations retrieved successfully', {
    locations: user.savedLocations
  });
});

/**
 * @desc    Add saved location
 * @route   POST /api/users/saved-locations
 * @access  Private
 */
export const addSavedLocation = asyncHandler(async (req, res) => {
  const locationData = sanitizeData(req.body);

  const user = await User.findById(req.user.id);

  // Check if maximum saved locations limit reached
  if (user.savedLocations.length >= 20) {
    throw new AppError('Maximum number of saved locations (20) reached', 400);
  }

  // Check if location name already exists
  const locationExists = user.savedLocations.some(
    location => location.name.toLowerCase() === locationData.name.toLowerCase()
  );

  if (locationExists) {
    throw new AppError('Location name already exists', 400);
  }

  user.savedLocations.push(locationData);
  await user.save();

  successResponse(res, 201, 'Location saved successfully', {
    location: user.savedLocations[user.savedLocations.length - 1]
  });
});

/**
 * @desc    Update saved location
 * @route   PUT /api/users/saved-locations/:id
 * @access  Private
 */
export const updateSavedLocation = asyncHandler(async (req, res) => {
  const locationData = sanitizeData(req.body);

  const user = await User.findById(req.user.id);
  const location = user.savedLocations.id(req.params.id);

  if (!location) {
    throw new AppError('Location not found', 404);
  }

  // Check if new name conflicts with existing locations
  if (locationData.name && locationData.name !== location.name) {
    const nameExists = user.savedLocations.some(
      loc => loc._id.toString() !== req.params.id &&
      loc.name.toLowerCase() === locationData.name.toLowerCase()
    );

    if (nameExists) {
      throw new AppError('Location name already exists', 400);
    }
  }

  // Update location fields
  Object.assign(location, locationData);
  await user.save();

  successResponse(res, 200, 'Location updated successfully', { location });
});

/**
 * @desc    Delete saved location
 * @route   DELETE /api/users/saved-locations/:id
 * @access  Private
 */
export const deleteSavedLocation = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const location = user.savedLocations.id(req.params.id);

  if (!location) {
    throw new AppError('Location not found', 404);
  }

  location.remove();
  await user.save();

  successResponse(res, 200, 'Location deleted successfully');
});

/**
 * @desc    Get user statistics
 * @route   GET /api/users/stats
 * @access  Private
 */
export const getUserStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  const stats = {
    addressCount: user.addresses.length,
    savedLocationsCount: user.savedLocations.length,
    lastLogin: user.lastLogin,
    accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)), // in days
    isVerified: user.isVerified
  };

  successResponse(res, 200, 'User statistics retrieved', { stats });
});
