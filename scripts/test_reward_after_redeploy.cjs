const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Test reward system after redeploy
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
  const User1Address = getAddress("User1Address");

  console.log("🧪 TESTING REWARD SYSTEM AFTER REDEPLOY");
  console.log("=".repeat(70));
  console.log();

  if (!LendingPoolAddress || !DAIAddress || !RewardDistributorAddress || !RewardAccumulatorAddress) {
    console.log("❌ Missing addresses!");
    console.log("LendingPool:", LendingPoolAddress);
    console.log("DAI:", DAIAddress);
    console.log("RewardDistributor:", RewardDistributorAddress);
    console.log("RewardAccumulator:", RewardAccumulatorAddress);
    return;
  }

  const lendingPool = await hre.ethers.getContractAt("LendingPool", LendingPoolAddress);
  const rewardDistributor = await hre.ethers.getContractAt("RewardDistributor", RewardDistributorAddress);
  const rewardAccumulator = await hre.ethers.getContractAt("RewardAccumulator", RewardAccumulatorAddress);
  const dai = await hre.ethers.getContractAt("IERC20", DAIAddress);

  // Check configuration
  console.log("1️⃣  CHECKING CONFIGURATION");
  console.log("-".repeat(70));
  const poolAccumulator = await lendingPool.rewardAccumulator();
  const accumulatorPool = await rewardAccumulator.lendingPool();
  const distributorAccumulator = await rewardDistributor.rewardAccumulator();
  
  console.log("LendingPool.rewardAccumulator:", poolAccumulator);
  console.log("RewardAccumulator.lendingPool:", accumulatorPool);
  console.log("RewardDistributor.rewardAccumulator:", distributorAccumulator);
  console.log();
  
  if (poolAccumulator.toLowerCase() !== RewardAccumulatorAddress.toLowerCase()) {
    console.log("❌ LendingPool.rewardAccumulator is NOT set correctly!");
    return;
  }
  if (accumulatorPool.toLowerCase() !== LendingPoolAddress.toLowerCase()) {
    console.log("❌ RewardAccumulator.lendingPool is NOT set correctly!");
    return;
  }
  console.log("✅ Configuration is correct");
  console.log();

  // Check user's current state
  const userAddress = User1Address;
  console.log("2️⃣  CHECKING USER STATE");
  console.log("-".repeat(70));
  const initialClaimable = await rewardDistributor.getClaimableReward(userAddress);
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const currentSupply = userReserve.supply.principal;
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  
  console.log("User:", userAddress);
  console.log("Current supply:", ethers.formatEther(currentSupply), "DAI");
  console.log("Last update time:", lastUpdateTime.toString());
  console.log("Last supply balance:", ethers.formatEther(lastSupplyBalance), "DAI");
  console.log("Initial claimable reward:", ethers.formatEther(initialClaimable), "LENDX");
  console.log();

  // Check recent transactions for RewardsAccumulated events
  console.log("3️⃣  CHECKING RECENT TRANSACTIONS FOR REWARDS");
  console.log("-".repeat(70));
  const currentBlock = await ethers.provider.getBlockNumber();
  const rewardAccumulatorInterface = new ethers.Interface([
    "event RewardsAccumulated(address indexed user, uint256 amount)"
  ]);
  
  let foundEvents = 0;
  for (let i = 0; i < 100 && currentBlock - i > 0; i++) {
    const blockNum = currentBlock - i;
    const block = await ethers.provider.getBlock(blockNum, true);
    
    if (block && block.transactions) {
      for (const txHash of block.transactions) {
        try {
          const receipt = await ethers.provider.getTransactionReceipt(txHash);
          for (const log of receipt.logs) {
            try {
              const parsed = rewardAccumulatorInterface.parseLog(log);
              if (parsed && parsed.name === "RewardsAccumulated") {
                foundEvents++;
                console.log(`✅ Found RewardsAccumulated event in block ${blockNum}`);
                console.log("   User:", parsed.args.user);
                console.log("   Amount:", ethers.formatEther(parsed.args.amount), "LENDX");
              }
            } catch (e) {
              // Not a RewardsAccumulated event
            }
          }
        } catch (e) {
          // Skip errors
        }
      }
    }
  }
  
  if (foundEvents === 0) {
    console.log("❌ NO RewardsAccumulated events found in last 100 blocks!");
    console.log("   This means rewards are NOT being accumulated");
    console.log();
    console.log("💡 POSSIBLE CAUSES:");
    console.log("   1. LendingPool does NOT have _accumulateRewards() function");
    console.log("   2. RewardAccumulator does NOT have the new accumulation logic");
    console.log("   3. Users need to make a new transaction to trigger rewards");
    console.log();
    console.log("🔧 SOLUTION:");
    console.log("   1. Redeploy LendingPool with latest code");
    console.log("   2. Redeploy RewardAccumulator with latest code");
    console.log("   3. Make a new supply/withdraw transaction");
  } else {
    console.log(`✅ Found ${foundEvents} RewardsAccumulated event(s)`);
  }
  console.log();

  // Check anti-spam parameters
  console.log("4️⃣  CHECKING ANTI-SPAM PARAMETERS");
  console.log("-".repeat(70));
  try {
    const minimumTimeElapsed = await rewardAccumulator.minimumTimeElapsed();
    const minimumRewardAmount = await rewardAccumulator.minimumRewardAmount();
    const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
    
    console.log("Minimum time elapsed:", minimumTimeElapsed.toString(), "seconds");
    console.log("Minimum reward amount:", ethers.formatEther(minimumRewardAmount), "LENDX");
    console.log("Supply rate:", ethers.formatEther(supplyRate), "LENDX per token per second");
    console.log();
    
    // Calculate expected reward if user has supply
    if (lastUpdateTime > 0n && lastSupplyBalance > 0n) {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const timeElapsed = currentTime - lastUpdateTime;
      const expectedReward = (lastSupplyBalance * supplyRate * timeElapsed) / ethers.parseUnits("1", 18);
      
      console.log("5️⃣  EXPECTED REWARD CALCULATION");
      console.log("-".repeat(70));
      console.log("Time elapsed:", timeElapsed.toString(), "seconds");
      console.log("Expected reward:", ethers.formatEther(expectedReward), "LENDX");
      console.log();
      
      if (expectedReward > 0n) {
        console.log("💡 User should have reward, but it's not claimable yet.");
        console.log("   This means rewards are NOT being accumulated automatically.");
        console.log("   → Need to make a new transaction to trigger accumulation");
      }
    }
  } catch (error) {
    console.log("❌ Error reading anti-spam parameters:", error.message);
    console.log("   → RewardAccumulator might not have the new code");
  }
  console.log();

  console.log("=".repeat(70));
  console.log("✅ TEST COMPLETE");
  console.log("=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
