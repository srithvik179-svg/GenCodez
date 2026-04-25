const mongoose = require('mongoose');
const { ethers } = require('ethers');
require('dotenv').config();

// Minimal Schema for migration
const electionSchema = new mongoose.Schema({
  title: String,
  startDate: Date,
  endDate: Date,
  status: String,
  contractAddress: String,
  onChainElectionId: Number,
  candidates: [{
    name: String,
    onChainId: Number
  }]
});

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Election = mongoose.model('Election', electionSchema);
  const electionId = process.argv[2];

  const election = await Election.findById(electionId);
  if (!election) {
    console.error('Election not found');
    process.exit(1);
  }

  console.log(`Migrating election: ${election.title}`);

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  // Minimal ABI for admin functions
  const abi = [
    "function createElection(string name, uint256 start, uint256 end) external",
    "function addCandidate(uint256 electionId, string name) external",
    "function electionCount() public view returns (uint256)"
  ];

  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

  // 1. Create election on new contract
  console.log('Deploying election to new contract...');
  const tx = await contract.createElection(
    election.title,
    Math.floor(election.startDate.getTime() / 1000),
    Math.floor(election.endDate.getTime() / 1000)
  );
  await tx.wait();

  const onChainElectionId = await contract.electionCount();
  console.log(`Election created on-chain with ID: ${onChainElectionId}`);

  // 2. Add candidates
  for (let i = 0; i < election.candidates.length; i++) {
    const candidate = election.candidates[i];
    console.log(`Adding candidate: ${candidate.name}...`);
    const cTx = await contract.addCandidate(onChainElectionId, candidate.name);
    await cTx.wait();
    
    // In our contract, candidate IDs start from 1
    candidate.onChainId = i + 1;
  }

  // 3. Update MongoDB
  election.onChainElectionId = Number(onChainElectionId);
  election.contractAddress = process.env.CONTRACT_ADDRESS;
  election.status = 'active';
  
  await election.save();
  console.log('Migration complete! MongoDB updated.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
