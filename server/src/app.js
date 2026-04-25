const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Route imports
const electionRoutes = require('./routes/electionRoutes');
const voterRoutes = require('./routes/voterRoutes');
const authRoutes = require('./routes/authRoutes');
const alertRoutes = require('./routes/alertRoutes');
const otpRoutes = require('./routes/otpRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

// Middleware imports
const errorHandler = require('./middlewares/errorHandler');

/**
 * Express App Configuration
 *
 * Sets up middleware stack, mounts API routes,
 * and attaches the centralized error handler.
 */

const app = express();

// --- Security Middleware ---
app.use(helmet()); // Set security-related HTTP headers
app.use(mongoSanitize()); // Prevent NoSQL injection attacks

const { generalLimiter, authLimiter, votingLimiter } = require('./middlewares/rateLimitMiddleware');

// --------------- Global Middleware ---------------

// Apply general rate limit to all /api routes
app.use('/api', generalLimiter);

// CORS — allow frontend origin
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// --------------- API Routes ---------------

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/elections', votingLimiter, electionRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/verify', verificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TrustVote API is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// --------------- Error Handler ---------------
app.use(errorHandler);

module.exports = app;
