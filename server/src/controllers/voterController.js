const Voter = require('../models/Voter');
const logger = require('../utils/logger');

/**
 * Voter Controller
 * Handles voter registration and lookup (hybrid: off-chain profile).
 */

// POST /api/voters/register — Register a voter
exports.registerVoter = async (req, res, next) => {
  try {
    const { walletAddress, name, email } = req.body;

    // Check if already registered
    let voter = await Voter.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (voter) {
      return res.status(400).json({
        success: false,
        message: 'Voter already registered with this wallet address',
      });
    }

    voter = await Voter.create({
      walletAddress: walletAddress.toLowerCase(),
      name,
      email,
      isRegistered: true,
    });

    logger.info(`Voter registered: ${voter.walletAddress}`);

    res.status(201).json({
      success: true,
      data: voter,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/voters/:address — Get voter by wallet address
exports.getVoterByAddress = async (req, res, next) => {
  try {
    const voter = await Voter.findOne({
      walletAddress: req.params.address.toLowerCase(),
    }).populate('elections.electionId', 'title status');

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found',
      });
    }

    res.status(200).json({
      success: true,
      data: voter,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/voters — List all voters
exports.getVoters = async (req, res, next) => {
  try {
    const voters = await Voter.find().sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: voters.length,
      data: voters,
    });
  } catch (error) {
    next(error);
  }
};
