const mongoose = require('mongoose');

/**
 * Election Model
 *
 * Represents an election/poll. Stores both off-chain metadata
 * (title, description, dates) and the on-chain contract reference.
 * Candidates are embedded as sub-documents for atomic reads.
 */

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true,
  },
  party: {
    type: String,
    trim: true,
    default: '',
  },
  // On-chain candidate index (set after contract deployment)
  onChainId: {
    type: Number,
    default: null,
  },
});

const electionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Election title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    candidates: {
      type: [candidateSchema],
      default: [],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    // Smart contract address once deployed on-chain
    contractAddress: {
      type: String,
      default: null,
    },
    // On-chain election ID within the contract
    onChainElectionId: {
      type: Number,
      default: null,
    },
    // Transaction hash for when the election was created on-chain
    creationTransactionHash: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    createdBy: {
      type: String, // wallet address or user ID
      required: true,
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

// Index for efficient queries
electionSchema.index({ status: 1, startDate: -1 });
electionSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Election', electionSchema);
