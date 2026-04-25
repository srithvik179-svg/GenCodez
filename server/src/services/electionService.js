const Election = require('../models/Election');

/**
 * Election Service
 * Business logic for election lifecycle management.
 * Controllers delegate to this layer to keep handlers thin.
 */

const electionService = {
  /**
   * Create a new election in MongoDB.
   */
  async create(data) {
    const election = await Election.create(data);
    return election;
  },

  /**
   * Get all elections, optionally filtered by status.
   */
  async getAll(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;

    const elections = await Election.find(query)
      .sort({ createdAt: -1 })
      .lean();
    return elections;
  },

  /**
   * Get a single election by its MongoDB _id.
   */
  async getById(id) {
    const election = await Election.findById(id).lean();
    return election;
  },

  /**
   * Update an election (only if still pending).
   */
  async update(id, data) {
    const election = await Election.findOneAndUpdate(
      { _id: id, status: 'pending' },
      data,
      { new: true, runValidators: true }
    );
    return election;
  },

  /**
   * Mark an election as active after on-chain deployment.
   */
  async activate(id, contractAddress, onChainElectionId) {
    const election = await Election.findByIdAndUpdate(
      id,
      {
        status: 'active',
        contractAddress,
        onChainElectionId,
      },
      { new: true }
    );
    return election;
  },

  /**
   * Mark an election as completed.
   */
  async complete(id) {
    const election = await Election.findByIdAndUpdate(
      id,
      { status: 'completed' },
      { new: true }
    );
    return election;
  },
};

module.exports = electionService;
