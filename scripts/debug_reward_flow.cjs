const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Debug reward flow - check all events in supply transaction
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
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");

  console.log("🔍 DEBUGGING REWARD FLOW");
  console.log("=".repeat(70));
  console.log();

  const lendingPool = await hre.ethers.getContractAt("LendingPool", LendingPoolAddress);
  const rewardAccumulator = await hre.ethers.getContractAt("RewardAccumulator", RewardAccumulatorAddress);
  const dai = await hre.ethers.getContractAt("IERC20", DAIAddress);

  // Get recent supply transaction
  console.log("1️⃣  FINDING RECENT SUPPLY TRANSACTION");
  console.log("-".repeat(70));
  const currentBlock = await ethers.provider.getBlockNumber();
  let testReceipt = null;
  
  for (let i = 0; i < 10 && currentBlock - i > 0; i++) {
    const blockNum = currentBlock - i;
    const block = await ethers.provider.getBlock(blockNum, true);
    
    if (block && block.transactions) {
      for (const txHash of block.transactions) {
        try {
          const tx = await ethers.provider.getTransaction(txHash);
          if (tx && tx.to && tx.to.toLowerCase() === LendingPoolAddress.toLowerCase()) {
            const receipt = await ethers.provider.getTransactionReceipt(txHash);
            
            // Check for Supplied event
            const lendingPoolInterface = new ethers.Interface([
              "event Supplied(address indexed user, address indexed asset, uint256 amount)"
            ]);
            
            for (const log of receipt.logs) {
              try {
                const parsed = lendingPoolInterface.parseLog(log);
                if (parsed && parsed.name === "Supplied") {
                  testReceipt = receipt;
                  console.log("✅ Found supply transaction!");
                  console.log("   Block:", blockNum);
                  console.log("   Hash:", txHash);
                  console.log("   User:", parsed.args.user);
                  console.log("   Amount:", ethers.formatEther(parsed.args.amount));
                  break;
                }
              } catch (e) {
                // Not a Supplied event
              }
            }
            
            if (testReceipt) break;
          }
        } catch (e) {
          // Skip errors
        }
      }
      if (testReceipt) break;
    }
  }
  
  if (!testReceipt) {
    console.log("❌ No recent supply transaction found");
    return;
  }
  console.log();

  // Check all events
  console.log("2️⃣  CHECKING ALL EVENTS IN TRANSACTION");
  console.log("-".repeat(70));
  
  const rewardAccumulatorInterface = new ethers.Interface([
    "event RewardsAccumulated(address indexed user, uint256 amount)"
  ]);
  
  const lendingPoolInterface2 = new ethers.Interface([
    "event RewardUpdateFailed(address indexed user, address indexed asset, bytes returnData)"
  ]);
  
  let foundRewardsAccumulated = false;
  let foundRewardUpdateFailed = false;
  
  for (const log of testReceipt.logs) {
    // Check RewardsAccumulated
    try {
      const parsed = rewardAccumulatorInterface.parseLog(log);
      if (parsed && parsed.name === "RewardsAccumulated") {
        foundRewardsAccumulated = true;
        console.log("✅ RewardsAccumulated event:");
        console.log("   User:", parsed.args.user);
        console.log("   Amount:", ethers.formatEther(parsed.args.amount), "LENDX");
      }
    } catch (e) {
      // Not RewardsAccumulated
    }
    
    // Check RewardUpdateFailed
    try {
      const parsed = lendingPoolInterface2.parseLog(log);
      if (parsed && parsed.name === "RewardUpdateFailed") {
        foundRewardUpdateFailed = true;
        console.log("⚠️  RewardUpdateFailed event:");
        console.log("   User:", parsed.args.user);
        console.log("   Asset:", parsed.args.asset);
        console.log("   Return data:", parsed.args.returnData);
      }
    } catch (e) {
      // Not RewardUpdateFailed
    }
  }
  
  if (!foundRewardsAccumulated && !foundRewardUpdateFailed) {
    console.log("❌ No reward-related events found");
    console.log("   → _updateSupplyReward() might not be called");
    console.log("   → Or it's failing silently");
  }
  console.log();

  // Check if updateSupplyBalance would accumulate
  console.log("3️⃣  CHECKING IF REWARD WOULD BE ACCUMULATED");
  console.log("-".repeat(70));
  try {
    // Get user from transaction
    const userAddress = deployer.address; // Use deployer for now
    
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
    
    if (lastUpdateTime > 0n && lastSupplyBalance > 0n) {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const timeElapsed = currentTime - lastUpdateTime;
      const expectedReward = (lastSupplyBalance * supplyRate * timeElapsed) / ethers.parseUnits("1", 18);
      
      console.log("Time elapsed:", timeElapsed.toString(), "seconds");
      console.log("Expected reward:", ethers.formatEther(expectedReward), "LENDX");
      console.log();
      
      const wouldAccumulate = timeElapsed >= minimumTimeElapsed || expectedReward >= minimumRewardAmount;
      console.log("Would accumulate?", wouldAccumulate ? "✅ YES" : "❌ NO");
      if (!wouldAccumulate) {
        console.log("   Reason:");
        if (timeElapsed < minimumTimeElapsed) {
          console.log("   - Time elapsed < minimum time elapsed");
        }
        if (expectedReward < minimumRewardAmount) {
          console.log("   - Expected reward < minimum reward amount");
        }
      }
    } else {
      console.log("⚠️  No previous state (first supply)");
      console.log("   → No reward to accumulate on first supply");
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });












