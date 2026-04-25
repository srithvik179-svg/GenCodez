const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB with retry logic.
 * Mongoose buffers commands until connected, so the app
 * can start accepting requests immediately.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8 defaults are already optimal; explicit for clarity
      autoIndex: true,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed (app termination)');
      process.exit(0);
    });

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    // Don't crash the server so health endpoint remains available
    // process.exit(1); 
  }
};

module.exports = connectDB;
