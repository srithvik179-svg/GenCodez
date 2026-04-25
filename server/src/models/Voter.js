const mongoose = require('mongoose');

/**
 * Voter Model (Hybrid Registration)
 *
 * Stores voter data off-chain in MongoDB while their on-chain
 * status is tracked via the smart contract. This enables
 * rich voter profiles without bloating on-chain storage.
 */

const voterSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: [true, 'Wallet address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'],
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    isRegistered: {
      type: Boolean,
      default: false,
    },
    // Elections this voter has participated in
    elections: [
      {
        electionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Election',
        },
        votedAt: {
          type: Date,
          default: Date.now,
        },
        // Transaction hash of the on-chain vote
        txHash: {
          type: String,
          default: null,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for fast wallet lookups
voterSchema.index({ walletAddress: 1 });

module.exports = mongoose.model('Voter', voterSchema);
