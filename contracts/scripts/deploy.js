const hre = require("hardhat");

/**
 * Deployment Script
 *
 * Deploys the TrustVote contract and logs the address.
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost
 *   npx hardhat run scripts/deploy.js --network amoy
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying TrustVote with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const TrustVote = await hre.ethers.getContractFactory("TrustVote");
  const trustVote = await TrustVote.deploy();

  await trustVote.waitForDeployment();

  const contractAddress = await trustVote.getAddress();

  console.log("✅ TrustVote deployed to:", contractAddress);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Copy this address to your .env: CONTRACT_ADDRESS=${contractAddress}`);
  console.log("  2. Also set VITE_CONTRACT_ADDRESS in client .env");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
