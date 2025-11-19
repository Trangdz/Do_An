const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Check if reward accumulation is being called correctly
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
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

  console.log("Testing reward accumulation call...");
  console.log();

  // Check if rewardAccumulator is set in LendingPool
  const poolAccumulator = await lendingPool.rewardAccumulator();
  console.log("LendingPool.rewardAccumulator:", poolAccumulator);
  console.log("Expected:", RewardAccumulatorAddress);
  console.log("Match:", poolAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log();

  // Check if lendingPool is set in RewardAccumulator
  const accumulatorLendingPool = await rewardAccumulator.lendingPool();
  console.log("RewardAccumulator.lendingPool:", accumulatorLendingPool);
  console.log("Expected:", LendingPoolAddress);
  console.log("Match:", accumulatorLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase());
  console.log();

  // Test direct call (should fail with "only LendingPool")
  console.log("Testing direct call (should fail)...");
  try {
    await rewardAccumulator.updateSupplyBalance(userAddress, DAIAddress, ethers.parseEther("1000"));
    console.log("❌ Should have failed!");
  } catch (error) {
    if (error.message.includes("only LendingPool")) {
      console.log("✅ Correctly protected - only LendingPool can call");
    } else {
      console.error("❌ Unexpected error:", error.message);
    }
  }
  console.log();

  // Check user supply
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const supplyBalance = userReserve.supply.principal;
  console.log("User supply balance:", ethers.formatEther(supplyBalance), "DAI");
  console.log();

  console.log("💡 Solution:");
  console.log("   If user already supplied before RewardAccumulator was deployed:");
  console.log("   1. User needs to make a NEW supply (even 0.0001 DAI)");
  console.log("   2. This will call _updateSupplyReward() which initializes tracking");
  console.log("   3. After that, rewards will accumulate on next supply/withdraw");
  console.log();
  console.log("   For NEW supplies (after RewardAccumulator deployment):");
  console.log("   - Rewards will start accumulating immediately");
  console.log("   - Next supply/withdraw will calculate and accumulate rewards");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });









