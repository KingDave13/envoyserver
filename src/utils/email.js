import nodemailer from 'nodemailer';
import { AppError } from './responseHandler.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Promise<void>}
   */
  async sendEmail(options) {
    try {
      const mailOptions = {
        from: `Envoy Angel <${process.env.EMAIL_USERNAME}>`,
        to: options.email,
        subject: options.subject,
        html: options.html
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new AppError('Failed to send email', 500);
    }
  }

  /**
   * Send welcome email
   * @param {Object} user - User object
   * @param {string} verificationUrl - Email verification URL
   */
  async sendWelcomeEmail(user, verificationUrl) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Envoy Angel!</h2>
        <p>Hello ${user.firstName},</p>
        <p>Thank you for registering with Envoy Angel. We're excited to have you on board!</p>
        <p>To get started, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Verify Email
          </a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This verification link will expire in 24 hours.</p>
        <p>Best regards,<br>The Envoy Angel Team</p>
      </div>
    `;

    await this.sendEmail({
      email: user.email,
      subject: 'Welcome to Envoy Angel - Please Verify Your Email',
      html
    });
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} resetUrl - Password reset URL
   */
  async sendPasswordResetEmail(user, resetUrl) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Hello ${user.firstName},</p>
        <p>You are receiving this email because you (or someone else) has requested to reset your password.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Reset Password
          </a>
        </div>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <p>This password reset link will expire in 1 hour.</p>
        <p>Best regards,<br>The Envoy Angel Team</p>
      </div>
    `;

    await this.sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      html
    });
  }

  /**
   * Send shipment confirmation email
   * @param {Object} shipment - Shipment object
   * @param {Object} user - User object
   */
  async sendShipmentConfirmation(shipment, user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Shipment Created Successfully</h2>
        <p>Hello ${user.firstName},</p>
        <p>Your shipment has been created successfully. Here are the details:</p>
        <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p><strong>Tracking Number:</strong> ${shipment.trackingNumber}</p>
          <p><strong>Type:</strong> ${shipment.type.charAt(0).toUpperCase() + shipment.type.slice(1)}</p>
          <p><strong>Status:</strong> ${shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1)}</p>
          <p><strong>Total Cost:</strong> NGN ${shipment.cost.total.toLocaleString()}</p>
        </div>
        <p>You can track your shipment using the tracking number above.</p>
        <p>Best regards,<br>The Envoy Angel Team</p>
      </div>
    `;

    await this.sendEmail({
      email: user.email,
      subject: 'Shipment Created - ' + shipment.trackingNumber,
      html
    });
  }

  /**
   * Send payment confirmation email
   * @param {Object} shipment - Shipment object
   * @param {Object} user - User object
   */
  async sendPaymentConfirmation(shipment, user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Successful</h2>
        <p>Hello ${user.firstName},</p>
        <p>Your payment for shipment ${shipment.trackingNumber} has been processed successfully.</p>
        <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p><strong>Amount Paid:</strong> NGN ${shipment.cost.total.toLocaleString()}</p>
          <p><strong>Payment Date:</strong> ${new Date(shipment.payment.paidAt).toLocaleString()}</p>
          <p><strong>Transaction ID:</strong> ${shipment.payment.transactionId}</p>
        </div>
        <p>Your shipment is now ready for pickup.</p>
        <p>Best regards,<br>The Envoy Angel Team</p>
      </div>
    `;

    await this.sendEmail({
      email: user.email,
      subject: 'Payment Confirmation - ' + shipment.trackingNumber,
      html
    });
  }

  /**
   * Send status update email
   * @param {Object} shipment - Shipment object
   * @param {Object} user - User object
   */
  /**
   * Send shipment confirmation email for guest users
   * @param {Object} shipment - Shipment object
   * @param {string} email - Guest user's email
   */
  async sendGuestShipmentConfirmation(shipment, email) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Shipment Created Successfully</h2>
        <p>Hello,</p>
        <p>Your shipment has been created successfully. Here are the details:</p>
        <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p><strong>Tracking Number:</strong> ${shipment.trackingNumber}</p>
          <p><strong>Type:</strong> ${shipment.type.charAt(0).toUpperCase() + shipment.type.slice(1)}</p>
          <p><strong>Status:</strong> ${shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1)}</p>
          <p><strong>Total Cost:</strong> NGN ${shipment.cost.total.toLocaleString()}</p>
        </div>
        <p>You can track your shipment using the tracking number above.</p>
        <p>Consider creating an account to manage your shipments more easily and get access to additional features!</p>
        <p>Best regards,<br>The Envoy Angel Team</p>
      </div>
    `;

    await this.sendEmail({
      email,
      subject: 'Shipment Created - ' + shipment.trackingNumber,
      html
    });
  }

  async sendStatusUpdateEmail(shipment, user) {
    const statusMessages = {
      awaiting_pickup: 'Your shipment is ready for pickup',
      picked_up: 'Your shipment has been picked up',
      in_transit: 'Your shipment is in transit',
      out_for_delivery: 'Your shipment is out for delivery',
      delivered: 'Your shipment has been delivered',
      cancelled: 'Your shipment has been cancelled'
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Shipment Status Update</h2>
        <p>Hello ${user.firstName},</p>
        <p>${statusMessages[shipment.status] || 'Your shipment status has been updated'}.</p>
        <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p><strong>Tracking Number:</strong> ${shipment.trackingNumber}</p>
          <p><strong>New Status:</strong> ${shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1).replace(/_/g, ' ')}</p>
          <p><strong>Updated At:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>You can track your shipment anytime using your tracking number.</p>
        <p>Best regards,<br>The Envoy Angel Team</p>
      </div>
    `;

    await this.sendEmail({
      email: user.email,
      subject: 'Shipment Status Update - ' + shipment.trackingNumber,
      html
    });
  }

  /**
   * Send refund confirmation email
   * @param {Object} shipment - Shipment object
   * @param {Object} user - User object
   * @param {Object} refund - Refund object
   */
  async sendRefundConfirmation(shipment, user, refund) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Refund Processed</h2>
        <p>Hello ${user.firstName},</p>
        <p>A refund has been processed for your shipment ${shipment.trackingNumber}.</p>
        <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p><strong>Refund Amount:</strong> NGN ${(refund.amount / 100).toLocaleString()}</p>
          <p><strong>Reason:</strong> ${shipment.payment.refundReason}</p>
          <p><strong>Refund Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>The refunded amount will be credited back to your original payment method. This may take 5-10 business days to reflect in your account.</p>
        <p>Best regards,<br>The Envoy Angel Team</p>
      </div>
    `;

    await this.sendEmail({
      email: user.email,
      subject: 'Refund Processed - ' + shipment.trackingNumber,
      html
    });
  }
}

export default new EmailService();
