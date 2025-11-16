const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Initialize RewardAccumulator state for existing supplies
 * This simulates what happens when user supplies - calls updateSupplyBalance via LendingPool
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log();

  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const LendingPoolAddress = getAddress("LendingPoolAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
  const DAIAddress = getAddress("DAIAddress");
  const userAddress = getAddress("User1Address");

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  console.log("🔧 Initializing RewardAccumulator state for existing supplies");
  console.log("=".repeat(70));
  console.log();

  // Check user supply
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const supplyPrincipal = userReserve.supply.principal;
  
  console.log("User:", userAddress);
  console.log("Current supply:", ethers.formatEther(supplyPrincipal), "DAI");
  console.log();

  // Check current state
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  
  console.log("Current RewardAccumulator state:");
  console.log("   lastUpdateTime:", lastUpdateTime.toString());
  console.log("   lastSupplyBalance:", ethers.formatEther(lastSupplyBalance), "DAI");
  console.log();

  if (lastUpdateTime === 0n && supplyPrincipal > 0n) {
    console.log("⚠️  State not initialized but user has supply");
    console.log("   Need to trigger updateSupplyBalance via LendingPool");
    console.log();
    console.log("💡 Solution:");
    console.log("   User needs to make a supply/withdraw transaction");
    console.log("   This will call LendingPool._updateSupplyReward()");
    console.log("   Which will call RewardAccumulator.updateSupplyBalance()");
    console.log("   This will initialize the state");
    console.log();
    console.log("   After initialization:");
    console.log("   - Next supply/withdraw will calculate rewards for time elapsed");
    console.log("   - Rewards will accumulate automatically");
  } else if (lastUpdateTime > 0n) {
    console.log("✅ State already initialized");
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const timeElapsed = currentTime - lastUpdateTime;
    console.log("   Time since last update:", Number(timeElapsed), "seconds");
    console.log("   Next supply/withdraw will calculate rewards for this time");
  } else {
    console.log("ℹ️  User has no supply, nothing to initialize");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


