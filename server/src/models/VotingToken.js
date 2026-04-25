const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Voting Token Model
 * A cryptographic one-time token generated for a user for a specific election.
 * This token must be provided to cast a vote and is burned (isUsed: true) upon use.
 */

const votingTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
    },
    token: {
      type: String,
      unique: true,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// One token per user per election
votingTokenSchema.index({ userId: 1, electionId: 1 }, { unique: true });

// Pre-validate hook to generate token string before Mongoose enforces required rules
votingTokenSchema.pre('validate', function(next) {
  if (this.isNew && !this.token) {
    this.token = crypto.randomBytes(16).toString('hex');
  }
  next();
});

module.exports = mongoose.model('VotingToken', votingTokenSchema);
