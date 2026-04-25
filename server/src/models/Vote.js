const mongoose = require('mongoose');

/**
 * Vote Model
 * Temporary off-chain storage for votes until they are fully migrated to the blockchain.
 */

const voteSchema = new mongoose.Schema(
  {
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // ZKP Nullifier Hash:
    // In a Zero-Knowledge Proof system, a 'nullifier' is a unique value 
    // derived from a user's secret key and the election ID. 
    // It allows the system to verify that a user hasn't voted twice 
    // without ever revealing WHICH user cast the vote.
    nullifierHash: {
      type: String,
      required: true,
    },
    // The transaction hash from the Polygon blockchain
    transactionHash: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    deviceFingerprint: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Double-voting prevention at the database layer using the ZKP Nullifier!
voteSchema.index({ nullifierHash: 1, electionId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
