const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const electionId = process.argv[2];
  
  const Election = mongoose.model('Election', new mongoose.Schema({
    title: String,
    candidates: [{
      name: String,
      onChainId: Number
    }]
  }));
  
  const election = await Election.findById(electionId);
  if (!election) {
    console.log('Election not found');
    process.exit(1);
  }
  
  console.log('Election Title:', election.title);
  console.log('Candidates:');
  election.candidates.forEach(c => {
    console.log(`- ${c.name}: onChainId = ${c.onChainId}`);
  });
  
  process.exit(0);
}

main();
