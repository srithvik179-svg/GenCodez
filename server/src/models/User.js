const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * User Model (Email/Password Auth)
 *
 * Supports traditional authentication alongside wallet-based auth.
 * A user can optionally link a wallet address for on-chain voting.
 */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // exclude from queries by default
    },
    role: {
      type: String,
      enum: ['voter', 'admin'],
      default: 'voter',
    },
    // Optional linked wallet for hybrid auth
    walletAddress: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    // Unique human-readable voter ID (e.g., VID-A1B2C3D4)
    voterId: {
      type: String,
      unique: true,
    },
    // Tracking for smart contract registration status
    isBlockchainRegistered: {
      type: Boolean,
      default: false,
    },
    // Security tracking for account lockout
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true,
  }
);

// Hash password before saving and generate voterId
userSchema.pre('save', async function (next) {
  // Generate unique Voter ID if this is a new document
  if (this.isNew && !this.voterId) {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.voterId = `VID-${randomHex}`;
  }

  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
