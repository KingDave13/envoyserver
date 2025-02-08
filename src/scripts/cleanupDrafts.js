import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Shipment from '../models/Shipment.js';
import notificationService from '../services/notificationService.js';

// Load environment variables
dotenv.config();

/**
 * Cleanup old draft shipments
 */
const cleanupDrafts = async () => {
  try {
    // Connect to database
    await connectDB();

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Find drafts older than a week
    const oldDrafts = await Shipment.find({
      isDraft: true,
      createdAt: { $lt: oneWeekAgo }
    });

    console.log(`Found ${oldDrafts.length} old drafts to clean up`);

    // Delete drafts and notify users
    for (const draft of oldDrafts) {
      if (draft.userId) {
        // Create notification before deleting
        await notificationService.createNotification({
          userId: draft.userId,
          type: 'system_notification',
          title: 'Draft Shipment Deleted',
          message: 'Your draft shipment has been deleted due to inactivity.',
          data: {
            draftId: draft._id,
            createdAt: draft.createdAt
          },
          priority: 'low'
        });
      }

      // Delete the draft
      await draft.deleteOne();
    }

    console.log('Draft cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up drafts:', error);
    process.exit(1);
  }
};

// Set up cron job if running as main script
if (process.argv[1] === new URL(import.meta.url).pathname) {
  cleanupDrafts();
}

// Export for use in other files
export default cleanupDrafts;
