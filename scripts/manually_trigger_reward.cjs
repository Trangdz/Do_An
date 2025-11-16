const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Manually trigger reward accumulation by calling updateSupplyBalance from LendingPool
 * This simulates what happens when user supplies/withdraws
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
  const userAddress = "0x767548d92f8B8138742675bA45609E5AD26568e8";

  console.log("🔧 MANUALLY TRIGGERING REWARD ACCUMULATION");
  console.log("=".repeat(70));
  console.log();

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Get current state
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const supplyPrincipal = userReserve.supply.principal;
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  const claimableBefore = await rewardDistributor.getClaimableReward(userAddress);

  console.log("Current state:");
  console.log("  Supply:", ethers.formatEther(supplyPrincipal), "DAI");
  console.log("  Last update time:", lastUpdateTime.toString());
  console.log("  Last supply balance:", ethers.formatEther(lastSupplyBalance), "DAI");
  console.log("  Claimable reward before:", ethers.formatEther(claimableBefore), "LENDX");
  console.log();

  // Calculate expected reward
  if (lastUpdateTime > 0n && lastSupplyBalance > 0n) {
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const timeElapsed = currentTime - lastUpdateTime;
    const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
    const expectedReward = (lastSupplyBalance * supplyRate * timeElapsed) / ethers.parseUnits("1", 18);
    
    console.log("Expected reward:");
    console.log("  Time elapsed:", timeElapsed.toString(), "seconds");
    console.log("  Supply rate:", ethers.formatEther(supplyRate), "LENDX per token per second");
    console.log("  Expected:", ethers.formatEther(expectedReward), "LENDX");
    console.log();
  }

  // Manually call updateSupplyBalance from LendingPool
  // We need to impersonate LendingPool or call it directly
  // Since we can't easily impersonate on Ganache, let's try a different approach:
  // Make a small supply transaction to trigger the reward
  
  console.log("💡 Solution:");
  console.log("   Since we can't easily impersonate LendingPool on Ganache,");
  console.log("   the best way is to make a small supply transaction.");
  console.log();
  console.log("   User should:");
  console.log("   1. Supply a very small amount (0.0001 DAI)");
  console.log("   2. This will trigger _updateSupplyReward");
  console.log("   3. Reward will be accumulated");
  console.log();
  console.log("   Or we can check if LendingPool code has the new function");
  console.log("   by checking for RewardUpdateFailed event in recent transactions");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


