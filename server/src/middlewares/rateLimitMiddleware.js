const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter Configuration
 *
 * Prevents DDoS and brute-force attacks by limiting the number of requests
 * a single IP can make within a specific time window.
 */

const isDev = process.env.NODE_ENV === 'development';

// 1. General API Limiter (100 requests per 15 mins)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Auth Limiter (5 attempts per 15 mins — Stricter for security)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 10,
  message: {
    success: false,
    message: 'Too many login/registration attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Voting Limiter (20 requests per 15 mins — Prevents bot spam)
const votingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 20,
  message: {
    success: false,
    message: 'Voting rate limit exceeded. Please wait before casting another vote.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  votingLimiter
};
