const { ethers } = require('ethers');
const logger = require('../utils/logger');

/**
 * Blockchain Service
 *
 * Wraps ethers.js interactions with the TrustVote smart contract.
 * Provides methods for deploying, voting, and reading results.
 * The ABI is loaded from the Hardhat compilation artifacts.
 */

let provider = null;
let signer = null;
let contractABI = null;

/**
 * Initialize the blockchain provider and signer.
 * Called once on server startup.
 */
const initialize = async () => {
  try {
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    signer = wallet;

    // Attempt to load ABI from Hardhat artifacts
    try {
      const artifact = require('../../../contracts/artifacts/contracts/TrustVote.sol/TrustVote.json');
      contractABI = artifact.abi;
      logger.info('Blockchain service initialized — ABI loaded');
    } catch {
      logger.warn('Contract ABI not found — run "npx hardhat compile" in contracts/');
    }

    const network = await provider.getNetwork();
    logger.info(`Connected to chain ID: ${network.chainId}`);
  } catch (error) {
    logger.error(`Blockchain init failed: ${error.message}`);
  }
};

/**
 * Get a contract instance connected to the signer.
 */
const getContract = (contractAddress) => {
  if (!contractABI) {
    throw new Error('Contract ABI not loaded. Compile contracts first.');
  }
  return new ethers.Contract(contractAddress || process.env.CONTRACT_ADDRESS, contractABI, signer);
};

/**
 * Create an election on-chain.
 */
const createElectionOnChain = async (contractAddress, name, startTime, endTime) => {
  const contract = getContract(contractAddress);
  const tx = await contract.createElection(name, startTime, endTime);
  const receipt = await tx.wait();
  logger.info(`Election created on-chain — tx: ${receipt.hash}`);
  return receipt;
};

/**
 * Create an election with candidates in a single transaction.
 */
const createElectionWithCandidatesOnChain = async (contractAddress, name, startTime, endTime, candidateNames) => {
  const contract = getContract(contractAddress);
  const tx = await contract.createElectionWithCandidates(name, startTime, endTime, candidateNames);
  const receipt = await tx.wait();
  logger.info(`Election with candidates created on-chain — tx: ${receipt.hash}`);
  return receipt;
};

/**
 * Add a candidate to an on-chain election.
 */
const addCandidateOnChain = async (contractAddress, electionId, candidateName) => {
  const contract = getContract(contractAddress);
  const tx = await contract.addCandidate(electionId, candidateName);
  const receipt = await tx.wait();
  logger.info(`Candidate added on-chain — tx: ${receipt.hash}`);
  return receipt;
};

/**
 * Cast a vote on-chain.
 */
const voteOnChain = async (contractAddress, electionId, candidateId, voterSigner) => {
  const contract = new ethers.Contract(contractAddress, contractABI, voterSigner);
  const tx = await contract.vote(electionId, candidateId);
  const receipt = await tx.wait();
  logger.info(`Vote cast on-chain — tx: ${receipt.hash}`);
  return receipt;
};

/**
 * Get election results from the contract.
 */
const getResultsOnChain = async (contractAddress, electionId) => {
  const contract = getContract(contractAddress);
  const results = await contract.getResults(electionId);
  return results;
};

/**
 * Check if a voter is already registered on the contract.
 */
const isVoterRegisteredOnChain = async (contractAddress, voterAddress) => {
  const contract = getContract(contractAddress);
  return await contract.registeredVoters(voterAddress);
};

/**
 * Register a voter on-chain (Admin action).
 */
const registerVoterOnChain = async (contractAddress, voterAddress) => {
  const contract = getContract(contractAddress);
  const tx = await contract.registerVoter(voterAddress);
  const receipt = await tx.wait();
  logger.info(`Voter ${voterAddress} registered on-chain — tx: ${receipt.hash}`);
  return receipt;
};

/**
 * Get the total number of elections on-chain.
 */
const getElectionCount = async (contractAddress) => {
  const contract = getContract(contractAddress);
  return await contract.electionCount();
};

module.exports = {
  initialize,
  getContract,
  createElectionOnChain,
  createElectionWithCandidatesOnChain,
  addCandidateOnChain,
  voteOnChain,
  getResultsOnChain,
  isVoterRegisteredOnChain,
  registerVoterOnChain,
  getElectionCount,
};
