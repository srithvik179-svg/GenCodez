const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Auth Controller
 * Supports both email/password and wallet-based authentication.
 */

// Helper: generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/register — Email/password registration
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'voter';

    const user = await User.create({ name, email, password, role });

    const token = generateToken(user._id, user.role);

    logger.info(`User registered: ${user.email}`);

    res.status(201).json({
      success: true,
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        voterId: user.voterId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login — Email/password login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Select password and security fields
    const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed attempts. Try again in ${Math.ceil((user.lockUntil - Date.now()) / 60000)} minutes.`
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;
      
      // Lock account after 5 attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = Date.now() + (30 * 60 * 1000); // 30 mins
        logger.warn(`Account locked: ${user.email}`);
      }
      
      await user.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Reset failed attempts on success
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const token = generateToken(user._id, user.role);

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      success: true,
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        voterId: user.voterId,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/wallet — Wallet-based login (signature verification)
exports.walletLogin = async (req, res, next) => {
  try {
    const { address, signature, message } = req.body;

    if (!address || !signature || !message) {
      return res.status(400).json({
        success: false,
        message: 'Address, signature, and message are required',
      });
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid wallet signature',
      });
    }

    // Find or create user by wallet address
    let user = await User.findOne({ walletAddress: address.toLowerCase() });

    if (!user) {
      // Auto-create a user record for first-time wallet logins
      user = await User.create({
        name: `User-${address.slice(0, 8)}`,
        email: `${address.toLowerCase()}@wallet.trustvote`,
        password: ethers.hexlify(ethers.randomBytes(32)), // random password
        walletAddress: address.toLowerCase(),
      });
      logger.info(`Wallet user created: ${address}`);
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      data: {
        id: user._id,
        name: user.name,
        walletAddress: user.walletAddress,
        role: user.role,
        voterId: user.voterId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/link-wallet — Link a wallet to an existing account
exports.linkWallet = async (req, res, next) => {
  try {
    const { address } = req.body;
    const userId = req.user.id;

    if (!address) {
      return res.status(400).json({ success: false, message: 'Wallet address is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.walletAddress = address.toLowerCase();
    await user.save();

    logger.info(`Wallet linked for user ${user.email}: ${address}`);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This wallet is already linked to another account' });
    }
    next(error);
  }
};

// GET /api/auth/me — Get current user from token
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
