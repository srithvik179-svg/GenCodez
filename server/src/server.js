require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const blockchainService = require('./services/blockchainService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'PRIVATE_KEY', 'RPC_URL'];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    logger.error(`CRITICAL CONFIG ERROR: Missing environment variable ${key}`);
    process.exit(1);
  }
});

/**
 * Server Entry Point
 *
 * 1. Connect to MongoDB
 * 2. Initialize blockchain provider
 * 3. Start Express server
 */

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust in production
    methods: ["GET", "POST"]
  }
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  socket.on('joinElection', (electionId) => {
    socket.join(`election_${electionId}`);
    logger.info(`Socket ${socket.id} joined room: election_${electionId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Attach io to app for access in routes/controllers if needed (optional pattern)
app.set('io', io);

const startServer = async () => {
  try {
    await connectDB();
    await blockchainService.initialize();

    server.listen(PORT, () => {
      logger.info(`🗳️  TrustVote server running on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   API: http://localhost:${PORT}/api`);
      logger.info(`   WebSocket: Initialized`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
 
