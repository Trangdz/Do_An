const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Check reward for a specific user
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
  const DAIAddress = getAddress("DAIAddress");
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");

  console.log("🔍 CHECKING USER REWARD");
  console.log("=".repeat(70));
  console.log();

  const rewardDistributor = await hre.ethers.getContractAt("RewardDistributor", RewardDistributorAddress);
  const rewardAccumulator = await hre.ethers.getContractAt("RewardAccumulator", RewardAccumulatorAddress);
  const lendingPool = await hre.ethers.getContractAt("LendingPool", LendingPoolAddress);

  // Get user address from environment variable or use deployer
  // Usage: USER_ADDRESS=0x... npx hardhat run scripts/check_user_reward.cjs --network ganache
  const userAddress = process.env.USER_ADDRESS || deployer.address;
  
  console.log("User address:", userAddress);
  console.log();

  // Check claimable reward
  console.log("1️⃣  CLAIMABLE REWARD");
  console.log("-".repeat(70));
  const claimableReward = await rewardDistributor.getClaimableReward(userAddress);
  console.log("Claimable reward:", ethers.formatEther(claimableReward), "LENDX");
  console.log();

  // Check user supply balance
  console.log("2️⃣  USER SUPPLY BALANCE");
  console.log("-".repeat(70));
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const supplyBalance = userReserve.supply.principal;
  console.log("Supply balance:", ethers.formatEther(supplyBalance), "DAI");
  console.log();

  // Check last update time and balance in RewardAccumulator
  console.log("3️⃣  REWARD ACCUMULATOR STATE");
  console.log("-".repeat(70));
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  const minimumTimeElapsed = await rewardAccumulator.minimumTimeElapsed();
  const minimumRewardAmount = await rewardAccumulator.minimumRewardAmount();
  const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
  
  console.log("Last update time:", lastUpdateTime.toString());
  console.log("Last supply balance:", ethers.formatEther(lastSupplyBalance), "DAI");
  console.log("Minimum time elapsed:", minimumTimeElapsed.toString(), "seconds");
  console.log("Minimum reward amount:", ethers.formatEther(minimumRewardAmount), "LENDX");
  console.log("Supply rate:", ethers.formatEther(supplyRate), "LENDX per token per second");
  console.log();

  // Calculate expected reward
  if (lastUpdateTime > 0n && lastSupplyBalance > 0n) {
    console.log("4️⃣  EXPECTED REWARD CALCULATION");
    console.log("-".repeat(70));
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const timeElapsed = currentTime - lastUpdateTime;
    const expectedReward = (lastSupplyBalance * supplyRate * timeElapsed) / ethers.parseUnits("1", 18);
    
    console.log("Time elapsed:", timeElapsed.toString(), "seconds");
    console.log("Expected reward:", ethers.formatEther(expectedReward), "LENDX");
    console.log();
    
    const wouldAccumulate = timeElapsed >= minimumTimeElapsed || expectedReward >= minimumRewardAmount;
    console.log("Would accumulate on next transaction?", wouldAccumulate ? "✅ YES" : "❌ NO");
    if (!wouldAccumulate) {
      console.log("   Reason:");
      if (timeElapsed < minimumTimeElapsed) {
        console.log(`   - Time elapsed (${timeElapsed}s) < minimum time (${minimumTimeElapsed}s)`);
      }
      if (expectedReward < minimumRewardAmount) {
        console.log(`   - Expected reward (${ethers.formatEther(expectedReward)} LENDX) < minimum amount (${ethers.formatEther(minimumRewardAmount)} LENDX)`);
      }
    }
  } else {
    console.log("4️⃣  STATE");
    console.log("-".repeat(70));
    console.log("⚠️  User has not been initialized in RewardAccumulator");
    console.log("   → User needs to make a supply/withdraw/borrow/repay transaction");
    console.log("   → This will initialize state and start tracking rewards");
  }
  console.log();

  // Recommendations
  console.log("5️⃣  RECOMMENDATIONS");
  console.log("=".repeat(70));
  if (claimableReward > 0n) {
    console.log("✅ User has claimable reward!");
    console.log("   → User can claim", ethers.formatEther(claimableReward), "LENDX");
  } else if (lastUpdateTime > 0n && lastSupplyBalance > 0n) {
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const timeElapsed = currentTime - lastUpdateTime;
    const expectedReward = (lastSupplyBalance * supplyRate * timeElapsed) / ethers.parseUnits("1", 18);
    const wouldAccumulate = timeElapsed >= minimumTimeElapsed || expectedReward >= minimumRewardAmount;
    
    if (wouldAccumulate) {
      console.log("💡 User has pending reward that will be accumulated on next transaction");
      console.log("   → User should make a supply/withdraw/borrow/repay transaction");
      console.log("   → Reward will be accumulated:", ethers.formatEther(expectedReward), "LENDX");
    } else {
      console.log("💡 User needs to wait or make a larger supply");
      console.log("   → Wait for more time to pass, or");
      console.log("   → Make a larger supply to increase reward amount");
    }
  } else {
    console.log("💡 User needs to make a transaction to initialize state");
    console.log("   → Supply some tokens (even 0.0001 DAI)");
    console.log("   → This will initialize reward tracking");
    console.log("   → On next transaction, rewards will be accumulated");
  }
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

