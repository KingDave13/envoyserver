import { AppError } from '../utils/responseHandler.js';
import Shipment from '../models/Shipment.js';
import notificationService from './notificationService.js';
import emailService from '../utils/email.js';
import socketService from './socketService.js';

class PaymentService {
  /**
   * Initialize bank transfer payment
   * @param {Object} shipment - Shipment object
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} Updated shipment
   */
  async initializeBankTransfer(shipment, paymentDetails) {
    // Validate payment details
    if (!paymentDetails.accountName || !paymentDetails.bankName) {
      throw new AppError('Account name and bank name are required', 400);
    }

    // Update shipment payment status
    shipment.payment = {
      status: 'awaiting_verification',
      method: 'bank_transfer',
      amount: shipment.cost.total,
      bankDetails: {
        accountName: paymentDetails.accountName,
        bankName: paymentDetails.bankName
      },
      createdAt: new Date()
    };

    await shipment.save();

    // Send notifications
    await notificationService.createPaymentVerificationNotification(
      shipment.userId,
      shipment
    );

    // Send email
    if (shipment.userId) {
      const user = await User.findById(shipment.userId);
      await emailService.sendPaymentConfirmation(shipment, user);
    }

    // Send socket notification
    socketService.sendPaymentUpdate(shipment.userId, {
      shipmentId: shipment._id,
      status: 'awaiting_verification',
      timestamp: new Date()
    });

    return shipment;
  }

  /**
   * Verify bank transfer payment
   * @param {string} shipmentId - Shipment ID
   * @param {Object} verificationDetails - Verification details
   * @returns {Promise<Object>} Updated shipment
   */
  async verifyBankTransfer(shipmentId, verificationDetails) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      throw new AppError('Shipment not found', 404);
    }

    if (shipment.payment.status !== 'awaiting_verification') {
      throw new AppError('Payment is not awaiting verification', 400);
    }

    // Update payment status
    shipment.payment.status = verificationDetails.verified ? 'completed' : 'failed';
    shipment.payment.verifiedAt = new Date();
    shipment.payment.verifiedBy = verificationDetails.adminId;
    shipment.payment.notes = verificationDetails.notes;

    if (verificationDetails.verified) {
      // Update shipment status to awaiting_pickup
      shipment.status = 'awaiting_pickup';
      
      // Add timeline entry
      await shipment.addTimelineEntry(
        'awaiting_pickup',
        null,
        'Payment verified, shipment ready for pickup'
      );
    } else {
      shipment.payment.rejectionReason = verificationDetails.rejectionReason;
    }

    await shipment.save();

    // Send notifications
    const notificationType = verificationDetails.verified ? 
      'payment_confirmed' : 'payment_rejected';

    await notificationService.createNotification({
      userId: shipment.userId,
      type: notificationType,
      data: {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        amount: shipment.cost.total,
        rejectionReason: verificationDetails.rejectionReason
      }
    });

    // Send email
    if (shipment.userId) {
      const user = await User.findById(shipment.userId);
      if (verificationDetails.verified) {
        await emailService.sendPaymentConfirmation(shipment, user);
      } else {
        await emailService.sendPaymentRejectionNotification(
          user,
          shipment,
          verificationDetails.rejectionReason
        );
      }
    }

    // Send socket notification
    socketService.sendPaymentUpdate(shipment.userId, {
      shipmentId: shipment._id,
      status: shipment.payment.status,
      verifiedAt: shipment.payment.verifiedAt,
      rejectionReason: shipment.payment.rejectionReason
    });

    return shipment;
  }

  /**
   * Process refund
   * @param {string} shipmentId - Shipment ID
   * @param {Object} refundDetails - Refund details
   * @returns {Promise<Object>} Updated shipment
   */
  async processRefund(shipmentId, refundDetails) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      throw new AppError('Shipment not found', 404);
    }

    if (shipment.payment.status !== 'completed') {
      throw new AppError('Payment must be completed to process refund', 400);
    }

    if (shipment.payment.refunded) {
      throw new AppError('Payment has already been refunded', 400);
    }

    // Update payment status
    shipment.payment.refunded = true;
    shipment.payment.refundedAt = new Date();
    shipment.payment.refundedBy = refundDetails.adminId;
    shipment.payment.refundReason = refundDetails.reason;
    shipment.payment.refundAmount = refundDetails.amount || shipment.cost.total;
    shipment.status = 'cancelled';

    await shipment.save();

    // Add timeline entry
    await shipment.addTimelineEntry(
      'cancelled',
      null,
      `Shipment cancelled and refunded: ${refundDetails.reason}`
    );

    // Send notifications
    await notificationService.createNotification({
      userId: shipment.userId,
      type: 'payment_refunded',
      data: {
        shipmentId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        amount: shipment.payment.refundAmount,
        reason: shipment.payment.refundReason
      }
    });

    // Send email
    if (shipment.userId) {
      const user = await User.findById(shipment.userId);
      await emailService.sendRefundConfirmation(
        shipment,
        user,
        {
          amount: shipment.payment.refundAmount,
          reason: shipment.payment.refundReason
        }
      );
    }

    // Send socket notification
    socketService.sendPaymentUpdate(shipment.userId, {
      shipmentId: shipment._id,
      status: 'refunded',
      refundedAt: shipment.payment.refundedAt,
      refundAmount: shipment.payment.refundAmount,
      reason: shipment.payment.refundReason
    });

    return shipment;
  }

  /**
   * Get payment status
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(shipmentId) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      throw new AppError('Shipment not found', 404);
    }

    return {
      status: shipment.payment.status,
      method: shipment.payment.method,
      amount: shipment.cost.total,
      createdAt: shipment.payment.createdAt,
      verifiedAt: shipment.payment.verifiedAt,
      refunded: shipment.payment.refunded,
      refundedAt: shipment.payment.refundedAt,
      refundAmount: shipment.payment.refundAmount,
      refundReason: shipment.payment.refundReason
    };
  }
}

export default new PaymentService();
