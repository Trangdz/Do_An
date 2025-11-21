const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== Fix Reward Claim Issue ===\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("");
  
  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ addresses.js not found!");
    process.exit(1);
  }
  
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };
  
  const LendingPoolAddress = getAddress("LendingPoolAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  
  console.log("📋 Contracts:");
  console.log("   LendingPool:", LendingPoolAddress);
  console.log("   RewardAccumulator:", RewardAccumulatorAddress);
  console.log("   RewardDistributor:", RewardDistributorAddress);
  console.log("");
  
  // Get contracts
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);
  
  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);
  
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);
  
  // 1. Check LendingPool.rewardAccumulator
  console.log("1️⃣  Checking LendingPool.rewardAccumulator...");
  const poolAccumulator = await lendingPool.rewardAccumulator();
  if (poolAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
    console.log("   ⚠️  Not set! Setting...");
    try {
      const tx = await lendingPool.connect(deployer).setRewardAccumulator(RewardAccumulatorAddress);
      await tx.wait();
      console.log("   ✅ Fixed!");
    } catch (error) {
      console.log("   ❌ Error:", error.message);
    }
  } else {
    console.log("   ✅ Correctly set!");
  }
  console.log("");
  
  // 2. Check RewardAccumulator.lendingPool
  console.log("2️⃣  Checking RewardAccumulator.lendingPool...");
  const accumulatorLendingPool = await rewardAccumulator.lendingPool();
  if (accumulatorLendingPool.toLowerCase() !== LendingPoolAddress.toLowerCase()) {
    console.log("   ⚠️  Not set! Setting...");
    try {
      const tx = await rewardAccumulator.connect(deployer).setLendingPool(LendingPoolAddress);
      await tx.wait();
      console.log("   ✅ Fixed!");
    } catch (error) {
      console.log("   ❌ Error:", error.message);
    }
  } else {
    console.log("   ✅ Correctly set!");
  }
  console.log("");
  
  // 3. Check RewardDistributor.rewardAccumulator
  console.log("3️⃣  Checking RewardDistributor.rewardAccumulator...");
  const distributorAccumulator = await rewardDistributor.rewardAccumulator();
  if (distributorAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
    console.log("   ⚠️  Not set! Setting...");
    try {
      const tx = await rewardDistributor.connect(deployer).setRewardAccumulator(RewardAccumulatorAddress);
      await tx.wait();
      console.log("   ✅ Fixed!");
    } catch (error) {
      console.log("   ❌ Error:", error.message);
    }
  } else {
    console.log("   ✅ Correctly set!");
  }
  console.log("");
  
  // 4. Check anti-spam parameters
  console.log("4️⃣  Checking anti-spam parameters...");
  const minTimeElapsed = await rewardAccumulator.minimumTimeElapsed();
  const minRewardAmount = await rewardAccumulator.minimumRewardAmount();
  console.log("   minimumTimeElapsed:", minTimeElapsed.toString(), "seconds");
  console.log("   minimumRewardAmount:", ethers.formatEther(minRewardAmount), "LENDX");
  
  // If too restrictive, suggest lowering for testing
  if (Number(minTimeElapsed) > 10) {
    console.log("   ⚠️  minimumTimeElapsed is high (>10s) - rewards only accumulate after this time");
    console.log("   💡 Consider lowering for testing: setAntiSpamParams(5, 1e15)");
  }
  if (Number(minRewardAmount) > 1e15) {
    console.log("   ⚠️  minimumRewardAmount is high - small rewards won't accumulate");
    console.log("   💡 Consider lowering for testing: setAntiSpamParams(5, 1e15)");
  }
  console.log("");
  
  // 5. Check reward rates
  console.log("5️⃣  Checking reward rates...");
  const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
  const borrowRate = await rewardAccumulator.borrowRewardRatePerTokenPerSecond();
  console.log("   Supply rate:", ethers.formatEther(supplyRate), "LENDX per token per second");
  console.log("   Borrow rate:", ethers.formatEther(borrowRate), "LENDX per token per second");
  
  // Calculate example reward
  const exampleSupply = ethers.parseUnits("1000", 18); // 1000 tokens
  const exampleTime = 60; // 60 seconds
  const exampleReward = (exampleSupply * supplyRate * BigInt(exampleTime)) / ethers.parseUnits("1", 18);
  console.log("   Example: 1000 tokens for 60s =", ethers.formatEther(exampleReward), "LENDX");
  console.log("");
  
  // 6. Check if user has supply/borrow
  console.log("6️⃣  Checking user activity...");
  console.log("   💡 To check a specific user, provide USER_ADDRESS env var");
  const userAddress = process.env.USER_ADDRESS || deployer.address;
  console.log("   Checking user:", userAddress);
  
  const WETHAddress = getAddress("WETHAddress");
  const DAIAddress = getAddress("DAIAddress");
  
  // Check supply balance
  try {
    const supplyBalance = await lendingPool.getCurrentSupplyBalance(userAddress, DAIAddress);
    if (supplyBalance > 0) {
      console.log("   ✅ Has supply:", ethers.formatEther(supplyBalance), "DAI");
      
      // Check last update time
      const lastUpdate = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
      const lastSupply = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
      console.log("   Last update:", lastUpdate.toString() === "0" ? "Never" : new Date(Number(lastUpdate) * 1000).toLocaleString());
      console.log("   Last supply balance:", ethers.formatEther(lastSupply), "DAI");
      
      if (lastUpdate.toString() === "0") {
        console.log("   ⚠️  State not initialized! Need to trigger updateSupplyBalance");
        console.log("   💡 Solution: Make a supply/withdraw transaction to initialize");
      } else {
        const timeSinceUpdate = Date.now() / 1000 - Number(lastUpdate);
        console.log("   Time since update:", Math.floor(timeSinceUpdate), "seconds");
        
        if (timeSinceUpdate < Number(minTimeElapsed)) {
          console.log("   ⚠️  Not enough time elapsed! Need", Number(minTimeElapsed), "seconds");
          console.log("   💡 Wait", Math.ceil(Number(minTimeElapsed) - timeSinceUpdate), "more seconds");
        } else {
          // Calculate expected reward
          const expectedReward = (lastSupply * supplyRate * BigInt(Math.floor(timeSinceUpdate))) / ethers.parseUnits("1", 18);
          console.log("   Expected reward:", ethers.formatEther(expectedReward), "LENDX");
          
          if (expectedReward < minRewardAmount) {
            console.log("   ⚠️  Reward too small! Need at least", ethers.formatEther(minRewardAmount), "LENDX");
            console.log("   💡 Solution: Wait longer or lower minimumRewardAmount");
          }
        }
      }
    } else {
      console.log("   ⚠️  No supply balance found");
    }
  } catch (error) {
    console.log("   ⚠️  Error checking supply:", error.message);
  }
  console.log("");
  
  // 7. Check claimable reward
  console.log("7️⃣  Checking claimable reward...");
  try {
    const claimable = await rewardDistributor.getClaimableReward(userAddress);
    console.log("   Claimable reward:", ethers.formatEther(claimable), "LENDX");
    
    if (claimable.toString() === "0") {
      console.log("   ⚠️  No claimable reward!");
      console.log("   💡 Possible reasons:");
      console.log("      1. Not enough time elapsed since last update");
      console.log("      2. Reward amount too small (< minimumRewardAmount)");
      console.log("      3. State not initialized (need to make a transaction)");
      console.log("      4. Reward not accumulated yet (will accumulate on next interaction)");
    }
  } catch (error) {
    console.log("   ❌ Error:", error.message);
  }
  console.log("");
  
  // 8. Suggestions
  console.log("=".repeat(60));
  console.log("💡 SOLUTIONS:");
  console.log("=".repeat(60));
  console.log("\n1. Lower anti-spam params for testing:");
  console.log(`   npx hardhat run scripts/lower_anti_spam_params.cjs --network ganache`);
  console.log("\n2. Make a supply/withdraw transaction to trigger reward accumulation");
  console.log("\n3. Wait for minimumTimeElapsed seconds between transactions");
  console.log("\n4. Check reward events:");
  console.log(`   npx hardhat run scripts/check_reward_events.cjs --network ganache`);
  console.log("");
}

main().catch(console.error);






