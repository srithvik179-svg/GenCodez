const electionService = require('../services/electionService');
const logger = require('../utils/logger');
const Vote = require('../models/Vote');
const Election = require('../models/Election');
const User = require('../models/User');
const VotingToken = require('../models/VotingToken');
const Otp = require('../models/Otp');
const VerificationSession = require('../models/VerificationSession');
const crypto = require('crypto');
const blockchainService = require('../services/blockchainService');

/**
 * Election Controller
 * Thin handlers that parse requests, call services, and return responses.
 */

// POST /api/elections — Create a new election
exports.createElection = async (req, res, next) => {
  try {
    const { title, description, candidates, startDate, endDate } = req.body;

    const election = await electionService.create({
      title,
      description,
      candidates,
      startDate,
      endDate,
      createdBy: req.user?.id || 'system',
    });

    logger.info(`Election created: ${election.title} (${election._id})`);

    res.status(201).json({
      success: true,
      data: election,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/elections — List all elections
exports.getElections = async (req, res, next) => {
  try {
    const { status } = req.query;
    const elections = await electionService.getAll({ status });

    res.status(200).json({
      success: true,
      count: elections.length,
      data: elections,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/elections/:id — Get single election
exports.getElectionById = async (req, res, next) => {
  try {
    const election = await electionService.getById(req.params.id);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found',
      });
    }

    // Check if current user has already voted (if logged in)
    let userHasVoted = false;
    if (req.user) {
      const token = await VotingToken.findOne({ userId: req.user.id, electionId: req.params.id });
      userHasVoted = !!(token && token.isUsed);
    }

    res.status(200).json({
      success: true,
      data: {
        ...(election.toObject ? election.toObject() : election),
        userHasVoted
      }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/elections/:id — Update election (pending only)
exports.updateElection = async (req, res, next) => {
  try {
    const election = await electionService.update(req.params.id, req.body);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found or already active',
      });
    }

    res.status(200).json({
      success: true,
      data: election,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/elections/:id/token — Generate a one-time voting token
exports.generateToken = async (req, res, next) => {
  try {
    const electionId = req.params.id;
    const userId = req.user.id;

    // --- STEP-UP AUTH CHECK (Requirement 3, 7 & Mobile Flow) ---
    const otpDoc = await Otp.findOne({ userId, electionId, isVerified: true });
    const mobileDoc = await VerificationSession.findOne({ userId, status: 'verified' });

    if (!otpDoc && !mobileDoc) {
      return res.status(403).json({ 
        success: false, 
        message: 'Security Verification Required: Please verify your identity via OTP or Mobile Biometric before voting.' 
      });
    }

    // Check if election is active and within time bounds
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    const now = new Date();
    if (now < election.startDate) {
      return res.status(400).json({ success: false, message: `Voting starts on ${election.startDate.toLocaleString()}` });
    }
    if (now > election.endDate) {
      return res.status(400).json({ success: false, message: 'Voting for this election has ended' });
    }
    if (election.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Election is not currently active' });
    }

    // Check if user has already voted
    const userAlreadyVoted = await Vote.exists({ electionId, nullifierHash: crypto.createHash('sha256').update(`${req.user.voterId}-${electionId}`).digest('hex') });
    if (userAlreadyVoted) {
      return res.status(400).json({ success: false, message: 'Security Restriction: You have already cast a vote in this election.' });
    }

    // Check if user already generated a token
    let tokenDoc = await VotingToken.findOne({ userId, electionId });
    
    if (tokenDoc) {
      const voteExists = await Vote.exists({ electionId, nullifierHash: crypto.createHash('sha256').update(`${req.user.voterId}-${electionId}`).digest('hex') });
      
      // Only block if they actually cast a vote
      if (tokenDoc.isUsed && voteExists) {
        return res.status(400).json({ success: false, message: 'Security Restriction: You have already cast a vote in this election.' });
      }
      
      // If the token was "used" but no vote was found, delete it and allow a fresh one
      if (tokenDoc.isUsed && !voteExists) {
        await VotingToken.deleteOne({ _id: tokenDoc._id });
        tokenDoc = null;
      } else {
        // Return existing unused token
        return res.status(200).json({ success: true, data: { token: tokenDoc.token } });
      }
    }

    // --- BLOCKCHAIN REGISTRATION ---
    // Ensure the voter is whitelisted on the smart contract
    const user = await User.findById(userId);
    if (user.walletAddress && !user.isBlockchainRegistered) {
      try {
        const isRegistered = await blockchainService.isVoterRegisteredOnChain(election.contractAddress, user.walletAddress);
        if (!isRegistered) {
          await blockchainService.registerVoterOnChain(election.contractAddress, user.walletAddress);
        }
        user.isBlockchainRegistered = true;
        await user.save();
      } catch (regError) {
        logger.warn(`Blockchain auto-registration skipped: ${regError.message}`);
      }
    }

    // Generate new token
    tokenDoc = await VotingToken.create({ userId, electionId });

    res.status(201).json({
      success: true,
      data: { token: tokenDoc.token },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Token already generated' });
    }
    next(error);
  }
};

// POST /api/elections/:id/vote — Cast an off-chain vote
exports.castVote = async (req, res, next) => {
  try {
    const electionId = req.params.id;
    const { candidateId, votingToken, transactionHash, fingerprint } = req.body;
    const userId = req.user.id;

    if (!votingToken || !fingerprint) {
      return res.status(400).json({ success: false, message: 'A valid one-time voting token and device fingerprint are required' });
    }

    // Verify token exists and belongs to user for this election
    const tokenDoc = await VotingToken.findOne({ token: votingToken, userId, electionId });
    if (!tokenDoc) {
      return res.status(400).json({ success: false, message: 'Invalid voting token' });
    }
    if (tokenDoc.isUsed) {
      return res.status(400).json({ success: false, message: 'This voting token has already been used' });
    }

    // Verify election is active
    const election = await Election.findById(electionId);
    if (!election || election.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Election is not currently active',
      });
    }

    // Fetch user to get their raw Voter ID
    const user = await User.findById(userId);
    if (!user || !user.voterId) {
      return res.status(400).json({ success: false, message: 'Invalid user profile' });
    }

    /**
     * ZKP SIMULATION: Nullifier Generation
     * In a real ZKP system, the user would generate a 'nullifier' locally using their secret key.
     * We simulate this by hashing the Voter ID with the Election ID (acting as a unique salt).
     * This creates a deterministic, anonymous link that prevents double voting without revealing identity.
     */
    const nullifierHash = crypto.createHash('sha256').update(`${user.voterId}-${electionId}`).digest('hex');
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Security Check 1: IP-Based Sybil Prevention (Re-enabled per user request)
    const ipConflict = await Vote.findOne({ 
      electionId, 
      ipAddress, 
      nullifierHash: { $ne: nullifierHash } 
    });

    if (ipConflict) {
      const Alert = require('../models/Alert');
      await Alert.create({
        type: 'SYBIL_ATTEMPT',
        severity: 'high',
        message: `Potential Sybil attack (IP) detected for election ${election.title}.`,
        metadata: { electionId, ipAddress, voterId: user.voterId }
      });

      return res.status(403).json({
        success: false,
        message: 'Security Restriction: Multiple unique votes detected from this network.'
      });
    }

    // Security Check 2: Device Fingerprint Prevention (Re-enabled per user request)
    const deviceConflict = await Vote.findOne({ 
      electionId, 
      deviceFingerprint: fingerprint, 
      nullifierHash: { $ne: nullifierHash } 
    });

    if (deviceConflict) {
      const Alert = require('../models/Alert');
      await Alert.create({
        type: 'SYBIL_ATTEMPT',
        severity: 'critical',
        message: `Device fingerprint conflict detected for election ${election.title}.`,
        metadata: { electionId, fingerprint, voterId: user.voterId }
      });

      return res.status(403).json({
        success: false,
        message: 'Security Restriction: Multiple unique votes detected from this device.'
      });
    }

    // Final check for existing vote (Double-voting prevention)
    const existingVote = await Vote.findOne({ electionId, nullifierHash });
    if (existingVote) {
      return res.status(403).json({
        success: false,
        message: 'Security Restriction: You have already cast a vote in this election.'
      });
    }

    // Burn the token
    tokenDoc.isUsed = true;
    await tokenDoc.save();

    // Create the vote
    const vote = await Vote.create({
      electionId,
      nullifierHash,
      candidateId, 
      transactionHash,
      ipAddress,
      deviceFingerprint: fingerprint
    });
    
    election.totalVotes += 1;
    await election.save();

    // Invalidate OTP and Mobile Sessions after successful use
    await Otp.deleteOne({ userId, electionId });
    await VerificationSession.deleteOne({ userId });

    // --- REAL-TIME UPDATES (Phase 45) ---
    const io = req.app.get('io');
    if (io) {
      io.to(`election_${electionId}`).emit('voteUpdate', { 
        electionId, 
        totalVotes: election.totalVotes 
      });
      logger.info(`Real-time update emitted for election ${electionId}`);
    }

    logger.info(`Anonymous vote cast for election ${electionId} using token ${votingToken}`);

    res.status(201).json({
      success: true,
      data: vote,
    });
  } catch (error) {
    // Catch mongoose unique constraint error (11000) for hashedVoterId
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted in this election',
      });
    }
    next(error);
  }
};

// GET /api/elections/:id/results — Get aggregated vote counts (Hybrid: DB + Blockchain)
exports.getElectionResults = async (req, res, next) => {
  try {
    const electionId = req.params.id;
    const election = await Election.findById(electionId);
    
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    // 1. Fetch Off-Chain results (MongoDB) for fast rendering
    const mongoose = require('mongoose');
    const dbResults = await Vote.aggregate([
      { $match: { electionId: new mongoose.Types.ObjectId(electionId) } },
      { $group: { _id: '$candidateId', count: { $sum: 1 } } }
    ]);

    // 2. Fetch On-Chain results (Polygon) for truth verification
    let onChainVoteCounts = {};
    let onChainSynced = false;

    if (election.onChainElectionId && election.contractAddress) {
      try {
        const [names, counts] = await blockchainService.getResultsOnChain(
          election.contractAddress, 
          election.onChainElectionId
        );
        
        // Map Solidity candidate indices (1-based) to counts
        counts.forEach((count, index) => {
          onChainVoteCounts[index + 1] = Number(count);
        });
        onChainSynced = true;
      } catch (bcError) {
        logger.warn(`Blockchain result fetch failed for ${electionId}: ${bcError.message}`);
      }
    }

    // 3. Merge and map counts back to candidates
    const candidatesWithCounts = election.candidates.map(candidate => {
      const dbResult = dbResults.find(r => r._id.toString() === candidate._id.toString());
      const dbVotes = dbResult ? dbResult.count : 0;
      
      // Use on-chain count if available, otherwise fallback to DB
      const onChainVotes = onChainSynced && candidate.onChainId ? onChainVoteCounts[candidate.onChainId] : null;

      return {
        _id: candidate._id,
        name: candidate.name,
        party: candidate.party,
        dbVotes,
        onChainVotes,
        // Final votes prioritized: Blockchain > Database
        votes: onChainVotes !== null ? onChainVotes : dbVotes
      };
    });

    // 4. Fetch recent transaction hashes for auditing
    const recentVotes = await Vote.find({ 
      electionId, 
      transactionHash: { $ne: null } 
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('transactionHash createdAt');

    res.status(200).json({
      success: true,
      data: {
        electionTitle: election.title,
        totalVotes: election.totalVotes,
        onChainSynced,
        results: candidatesWithCounts.sort((a, b) => b.votes - a.votes),
        recentTransactions: recentVotes
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/elections/:id/candidates — Add candidate to election
exports.addCandidate = async (req, res, next) => {
  try {
    const { name, party } = req.body;
    const election = await Election.findById(req.params.id);
    
    if (!election) return res.status(404).json({ success: false, message: 'Election not found' });
    if (election.status !== 'pending') return res.status(400).json({ success: false, message: 'Cannot add candidates to active/completed elections' });

    election.candidates.push({ name, party: party || 'Independent' });
    await election.save();

    res.status(201).json({ success: true, data: election });
  } catch (error) {
    next(error);
  }
};

// POST /api/elections/:id/activate — Sync election to blockchain
exports.activateElection = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found' });
    if (election.candidates.length < 2) return res.status(400).json({ success: false, message: 'Election must have at least 2 candidates' });

    // 1. Sync election and candidates in ONE transaction (Efficiency + Nonce Fix)
    const startTime = Math.floor(new Date(election.startDate).getTime() / 1000);
    const endTime = Math.floor(new Date(election.endDate).getTime() / 1000);
    const candidateNames = election.candidates.map(c => c.name);
    
    const txReceipt = await blockchainService.createElectionWithCandidatesOnChain(
      null, 
      election.title, 
      startTime, 
      endTime, 
      candidateNames
    );
    
    // Fetch the new election ID from the contract
    const onChainElectionId = await blockchainService.getElectionCount();
    
    // Update local candidates with their on-chain IDs (1-based)
    for (let i = 0; i < election.candidates.length; i++) {
      election.candidates[i].onChainId = i + 1;
    }

    election.status = 'active';
    election.onChainElectionId = Number(onChainElectionId);
    election.contractAddress = process.env.CONTRACT_ADDRESS;
    election.creationTransactionHash = txReceipt.hash;
    
    await election.save();

    res.status(200).json({ success: true, data: election });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/elections/:id — Delete an election (pending only)
exports.deleteElection = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id);
    
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    if (election.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete an active or completed election from the database. It is permanently recorded on the blockchain.' 
      });
    }

    await Election.findByIdAndDelete(req.params.id);
    
    // Also cleanup related tokens
    await VotingToken.deleteMany({ electionId: req.params.id });

    logger.info(`Election deleted: ${election.title} (${req.params.id})`);

    res.status(200).json({
      success: true,
      message: 'Election and associated data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

