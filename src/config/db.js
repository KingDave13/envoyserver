import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in Mongoose 7+, but kept for clarity
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Add custom query methods
    mongoose.Query.prototype.paginate = function(page = 1, limit = 10) {
      const skip = (page - 1) * limit;
      return this.skip(skip).limit(limit);
    };

    // Add global plugins
    mongoose.plugin(schema => {
      // Add createdAt and updatedAt timestamps
      schema.set('timestamps', true);
      
      // Convert _id to id in JSON
      schema.set('toJSON', {
        virtuals: true,
        versionKey: false,
        transform: (doc, converted) => {
          converted.id = converted._id;
          delete converted._id;
          delete converted.__v;
        }
      });
    });

    // Log successful connection
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', err => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
