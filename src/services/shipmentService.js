import { AppError } from '../utils/responseHandler.js';

class ShipmentService {
  constructor() {
    // Load rates from environment variables with default values
    this.baseRates = {
      international: parseFloat(process.env.BASE_RATE_INTERNATIONAL || 20),
      local: parseFloat(process.env.BASE_RATE_LOCAL || 10)
    };
    this.vatRate = parseFloat(process.env.VAT_RATE || 0.075);
    this.insuranceRates = {
      basic: parseFloat(process.env.INSURANCE_RATE_BASIC || 0.01),
      premium: parseFloat(process.env.INSURANCE_RATE_PREMIUM || 0.02)
    };

    // Validate rates
    if (isNaN(this.baseRates.international) || isNaN(this.baseRates.local) || 
        isNaN(this.vatRate) || isNaN(this.insuranceRates.basic) || 
        isNaN(this.insuranceRates.premium)) {
      throw new Error('Invalid shipping rate configuration');
    }
  }

  /**
   * Calculate volumetric weight for a package
   * @param {Object} dimensions Package dimensions
   * @returns {number} Volumetric weight
   */
  calculateVolumetricWeight(dimensions) {
    return (dimensions.length * dimensions.width * dimensions.height) / 5000;
  }

  /**
   * Calculate chargeable weight for a package
   * @param {Object} pkg Package details
   * @returns {number} Chargeable weight
   */
  calculateChargeableWeight(pkg) {
    const volumetricWeight = this.calculateVolumetricWeight(pkg.dimensions);
    return Math.max(pkg.weight, volumetricWeight);
  }

  /**
   * Calculate total chargeable weight for all packages
   * @param {Array} packages Array of package objects
   * @returns {number} Total chargeable weight
   */
  calculateTotalChargeableWeight(packages) {
    return packages.reduce((total, pkg) => {
      return total + this.calculateChargeableWeight(pkg);
    }, 0);
  }

  /**
   * Calculate base shipping cost
   * @param {string} type Shipment type (international/local)
   * @param {Array} packages Array of package objects
   * @returns {number} Base shipping cost
   */
  calculateBaseShippingCost(type, packages) {
    const totalWeight = this.calculateTotalChargeableWeight(packages);
    const baseRate = this.baseRates[type];
    let cost = totalWeight * baseRate;

    // Apply distance factor for international shipments
    if (type === 'international') {
      cost *= 1.5;
    }

    // Apply additional charges for special handling
    packages.forEach(pkg => {
      if (pkg.isFragile) cost *= 1.2;
      if (pkg.isPerishable) cost *= 1.15;
      if (pkg.isHazardous) cost *= 1.3;
    });

    return parseFloat(cost.toFixed(2));
  }

  /**
   * Calculate insurance cost
   * @param {string} insuranceType Insurance type (none/basic/premium)
   * @param {number} baseAmount Base shipping cost
   * @returns {number} Insurance cost
   */
  calculateInsuranceCost(insuranceType, baseAmount) {
    if (insuranceType === 'none') return 0;
    return parseFloat((baseAmount * this.insuranceRates[insuranceType]).toFixed(2));
  }

  /**
   * Calculate total shipping cost
   * @param {Object} shipmentData Shipment details
   * @returns {Object} Cost breakdown
   */
  calculateShippingCost(shipmentData) {
    const baseAmount = this.calculateBaseShippingCost(
      shipmentData.type,
      shipmentData.packages
    );

    const insuranceCost = this.calculateInsuranceCost(
      shipmentData.insurance?.type || 'none',
      baseAmount
    );

    const vat = parseFloat((baseAmount * this.vatRate).toFixed(2));
    const total = parseFloat((baseAmount + insuranceCost + vat).toFixed(2));

    return {
      baseAmount,
      insurance: insuranceCost,
      vat,
      total
    };
  }

  /**
   * Estimate delivery date based on shipment details
   * @param {Object} shipmentData Shipment details
   * @returns {Date} Estimated delivery date
   */
  estimateDeliveryDate(shipmentData) {
    const pickupDate = new Date(shipmentData.pickup.date);
    let deliveryDays = 0;

    // Base delivery days by type
    if (shipmentData.type === 'international') {
      deliveryDays = 5; // Base 5 days for international
    } else {
      deliveryDays = 2; // Base 2 days for local
    }

    // Add processing time for multiple packages
    if (shipmentData.packages.length > 1) {
      deliveryDays += Math.ceil(shipmentData.packages.length / 2);
    }

    // Add handling time for special packages
    const hasSpecialHandling = shipmentData.packages.some(
      pkg => pkg.isFragile || pkg.isPerishable || pkg.isHazardous
    );
    if (hasSpecialHandling) deliveryDays += 1;

    // Calculate estimated date
    const estimatedDate = new Date(pickupDate);
    estimatedDate.setDate(estimatedDate.getDate() + deliveryDays);

    // Adjust for weekends
    while (estimatedDate.getDay() === 0 || estimatedDate.getDay() === 6) {
      estimatedDate.setDate(estimatedDate.getDate() + 1);
    }

    return estimatedDate;
  }

  /**
   * Validate addresses for shipment type
   * @param {Object} shipmentData Shipment details
   * @throws {AppError} If addresses are invalid for shipment type
   */
  validateAddresses(shipmentData) {
    const { type, sender, recipient } = shipmentData;

    if (type === 'international') {
      if (sender.address.country === recipient.address.country) {
        throw new AppError(
          'International shipments must be between different countries',
          400
        );
      }
    } else {
      if (sender.address.country !== recipient.address.country) {
        throw new AppError(
          'Local shipments must be within the same country',
          400
        );
      }
    }
  }

  /**
   * Validate pickup date
   * @param {Date} pickupDate Pickup date
   * @throws {AppError} If pickup date is invalid
   */
  validatePickupDate(pickupDate) {
    const date = new Date(pickupDate);
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);

    if (date < now) {
      throw new AppError('Pickup date cannot be in the past', 400);
    }

    if (date > maxDate) {
      throw new AppError('Pickup date cannot be more than 30 days in the future', 400);
    }

    if (date.getDay() === 0 || date.getDay() === 6) {
      throw new AppError('Pickup is not available on weekends', 400);
    }
  }

  /**
   * Format tracking updates for timeline
   * @param {string} status Shipment status
   * @returns {Object} Formatted status update
   */
  formatStatusUpdate(status) {
    const statusMessages = {
      pending: 'Shipment created and pending payment',
      awaiting_pickup: 'Ready for pickup',
      picked_up: 'Package has been picked up',
      in_transit: 'Package is in transit',
      out_for_delivery: 'Package is out for delivery',
      delivered: 'Package has been delivered',
      cancelled: 'Shipment has been cancelled'
    };

    return {
      status,
      description: statusMessages[status] || status
    };
  }

  /**
   * Validate package dimensions and weight
   * @param {Array} packages Array of package objects
   * @throws {AppError} If package dimensions or weight are invalid
   */
  validatePackages(packages) {
    if (!packages || !packages.length) {
      throw new AppError('At least one package is required', 400);
    }

    if (packages.length > 10) {
      throw new AppError('Maximum 10 packages allowed per shipment', 400);
    }

    packages.forEach((pkg, index) => {
      if (pkg.weight <= 0) {
        throw new AppError(`Package ${index + 1}: Weight must be greater than 0`, 400);
      }

      if (pkg.dimensions.length <= 0 || pkg.dimensions.width <= 0 || pkg.dimensions.height <= 0) {
        throw new AppError(`Package ${index + 1}: Invalid dimensions`, 400);
      }

      const maxDimension = 150; // 150cm max for any dimension
      if (pkg.dimensions.length > maxDimension || 
          pkg.dimensions.width > maxDimension || 
          pkg.dimensions.height > maxDimension) {
        throw new AppError(
          `Package ${index + 1}: Maximum dimension allowed is ${maxDimension}cm`,
          400
        );
      }

      const maxWeight = pkg.type === 'documents' ? 5 : 70; // 5kg for documents, 70kg for others
      if (pkg.weight > maxWeight) {
        throw new AppError(
          `Package ${index + 1}: Maximum weight allowed is ${maxWeight}kg`,
          400
        );
      }
    });
  }
}

export default new ShipmentService();
