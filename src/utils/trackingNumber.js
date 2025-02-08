/**
 * Generate tracking number for shipment
 * Format: [TYPE]-[YYYYMMDD]-[RANDOM]
 * Example: INT-20250205-001 or LOC-20250205-001
 * @param {string} type - Shipment type (international/local)
 * @returns {string} Tracking number
 */
export const generateTrackingNumber = async (type) => {
  // Get current date in YYYYMMDD format
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}${month}${day}`;

  // Get prefix based on type
  const prefix = type.toLowerCase() === 'international' ? 'INT' : 'LOC';

  // Generate random 3-digit number
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  // Combine parts
  return `${prefix}-${dateString}-${random}`;
};

/**
 * Validate tracking number format
 * @param {string} trackingNumber - Tracking number to validate
 * @returns {boolean} Whether tracking number is valid
 */
export const isValidTrackingNumber = (trackingNumber) => {
  const pattern = /^(INT|LOC)-\d{8}-\d{3}$/;
  return pattern.test(trackingNumber);
};

/**
 * Extract shipment type from tracking number
 * @param {string} trackingNumber - Tracking number
 * @returns {string} Shipment type (international/local)
 */
export const getShipmentTypeFromTracking = (trackingNumber) => {
  if (!isValidTrackingNumber(trackingNumber)) {
    throw new Error('Invalid tracking number format');
  }

  const prefix = trackingNumber.split('-')[0];
  return prefix === 'INT' ? 'international' : 'local';
};

/**
 * Extract date from tracking number
 * @param {string} trackingNumber - Tracking number
 * @returns {Date} Shipment date
 */
export const getDateFromTracking = (trackingNumber) => {
  if (!isValidTrackingNumber(trackingNumber)) {
    throw new Error('Invalid tracking number format');
  }

  const dateString = trackingNumber.split('-')[1];
  const year = parseInt(dateString.substring(0, 4));
  const month = parseInt(dateString.substring(4, 6)) - 1;
  const day = parseInt(dateString.substring(6, 8));

  return new Date(year, month, day);
};

/**
 * Format tracking number for display
 * @param {string} trackingNumber - Tracking number
 * @returns {string} Formatted tracking number
 */
export const formatTrackingNumber = (trackingNumber) => {
  if (!isValidTrackingNumber(trackingNumber)) {
    throw new Error('Invalid tracking number format');
  }

  const [prefix, date, sequence] = trackingNumber.split('-');
  const formattedDate = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
  
  return `${prefix}-${formattedDate}-${sequence}`;
};

/**
 * Generate QR code data for tracking number
 * @param {string} trackingNumber - Tracking number
 * @returns {string} QR code data URL
 */
export const generateTrackingQRData = (trackingNumber) => {
  if (!isValidTrackingNumber(trackingNumber)) {
    throw new Error('Invalid tracking number format');
  }

  // Generate tracking URL
  const trackingUrl = `${process.env.CLIENT_URL}/track/${trackingNumber}`;
  
  return {
    trackingUrl,
    qrData: {
      trackingNumber,
      url: trackingUrl,
      type: getShipmentTypeFromTracking(trackingNumber),
      date: getDateFromTracking(trackingNumber)
    }
  };
};

/**
 * Parse tracking number components
 * @param {string} trackingNumber - Tracking number
 * @returns {Object} Tracking number components
 */
export const parseTrackingNumber = (trackingNumber) => {
  if (!isValidTrackingNumber(trackingNumber)) {
    throw new Error('Invalid tracking number format');
  }

  const [prefix, dateString, sequence] = trackingNumber.split('-');

  return {
    type: prefix === 'INT' ? 'international' : 'local',
    date: getDateFromTracking(trackingNumber),
    sequence: parseInt(sequence),
    formatted: formatTrackingNumber(trackingNumber)
  };
};
