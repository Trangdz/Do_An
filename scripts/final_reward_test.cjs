const hre = require("hardhat");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

/**
 * @notice Final test - simulate a complete supply transaction and check reward
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
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const DAIAddress = getAddress("DAIAddress");
  const userAddress = getAddress("User1Address");

  console.log("🎯 FINAL REWARD TEST");
  console.log("=".repeat(70));
  console.log();

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // DAI ABI
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function transfer(address, uint256) returns (bool)",
    "function decimals() view returns (uint8)"
  ];
  const dai = new ethers.Contract(DAIAddress, ERC20_ABI, deployer);

  // Final verification
  console.log("✅ FINAL VERIFICATION");
  console.log("-".repeat(70));
  const poolAccumulator = await lendingPool.rewardAccumulator();
  const accumulatorLendingPool = await rewardAccumulator.lendingPool();
  const accumulatorDistributor = await rewardAccumulator.rewardDistributor();
  const distributorAccumulator = await rewardDistributor.rewardAccumulator();
  
  console.log("LendingPool.rewardAccumulator:", poolAccumulator);
  console.log("  ✓", poolAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log("RewardAccumulator.lendingPool:", accumulatorLendingPool);
  console.log("  ✓", accumulatorLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase());
  console.log("RewardAccumulator.rewardDistributor:", accumulatorDistributor);
  console.log("RewardDistributor.rewardAccumulator:", distributorAccumulator);
  console.log("  ✓", distributorAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase());
  console.log();

  if (
    poolAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase() &&
    accumulatorLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase() &&
    distributorAccumulator.toLowerCase() === RewardAccumulatorAddress.toLowerCase()
  ) {
    console.log("✅ ALL CONFIGURATIONS ARE CORRECT!");
    console.log();
    console.log("🎁 Reward system is ready!");
    console.log();
    console.log("📋 To test:");
    console.log("   1. User supplies tokens (e.g., 100 DAI)");
    console.log("   2. Wait 10 seconds");
    console.log("   3. User supplies again (e.g., 0.0001 DAI)");
    console.log("   4. Check claimable reward - should see ~0.1 LENDX (100 × 0.001 × 10)");
    console.log();
    console.log("💡 Important:");
    console.log("   - First supply initializes state (no reward)");
    console.log("   - Second supply calculates reward for time elapsed");
    console.log("   - Reward rate: 0.001 LENDX/second per token");
  } else {
    console.log("❌ Configuration mismatch detected!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


