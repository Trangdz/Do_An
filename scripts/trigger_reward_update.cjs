const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Trigger reward update by making a tiny supply/withdraw
 * This will initialize RewardAccumulator for existing supplies
 */
async function main() {
  // Get user address from command line or use a test user
  const userIndex = process.argv[2] || "1"; // Default to User1
  const [deployer] = await hre.ethers.getSigners();
  
  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const LendingPoolAddress = getAddress("LendingPoolAddress");
  const DAIAddress = getAddress("DAIAddress");
  const userAddress = getAddress(`User${userIndex}Address`);

  if (!userAddress) {
    console.error("User address not found. Usage: node scripts/trigger_reward_update.cjs [userIndex]");
    process.exit(1);
  }

  console.log("User:", userAddress);
  console.log("Asset: DAI", DAIAddress);
  console.log();

  // Get user signer (we'll need to impersonate or use actual user)
  // For testing, we can use deployer to supply a tiny amount on behalf of user
  // But that won't work because supply is from msg.sender
  
  // Better: Use the actual user account if we have access
  // Or make a tiny withdraw (which user can do)
  
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  // Check current supply
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const currentSupply = userReserve.supply.principal;
  
  console.log("Current supply:", ethers.formatEther(currentSupply), "DAI");
  
  if (currentSupply === 0n) {
    console.log("User has no supply. Cannot trigger update.");
    return;
  }

  // Try to make a tiny withdraw to trigger update
  // But we need user's signer for this
  
  console.log("\n💡 Solution:");
  console.log("   User needs to make a small action to trigger reward accumulation:");
  console.log("   1. Supply a tiny amount (even 0.0001 DAI)");
  console.log("   2. OR withdraw a tiny amount (even 0.0001 DAI)");
  console.log("   This will call RewardAccumulator.updateSupplyBalance()");
  console.log("   and initialize/update the reward tracking");
  console.log();
  console.log("   After that, rewards will accumulate automatically over time!");
  console.log("   Next time user supplies/withdraws, they'll get rewards for the time elapsed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

















