const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Test if reward can be claimed immediately after a supply transaction
 * This checks if LendingPool has the new code with _accumulateRewards
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

  console.log("🧪 TESTING IMMEDIATE REWARD CLAIM");
  console.log("=".repeat(70));
  console.log();

  const lendingPool = await hre.ethers.getContractAt("LendingPool", LendingPoolAddress);
  const rewardDistributor = await hre.ethers.getContractAt("RewardDistributor", RewardDistributorAddress);
  const rewardAccumulator = await hre.ethers.getContractAt("RewardAccumulator", RewardAccumulatorAddress);
  const dai = await hre.ethers.getContractAt("IERC20", DAIAddress);

  // Use deployer for testing (or check recent transactions)
  console.log("1️⃣  CHECKING RECENT TRANSACTIONS");
  console.log("-".repeat(70));
  
  // Get recent blocks and check for supply transactions
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  console.log("Checking last 50 blocks for supply transactions...");
  console.log();

  let foundTransaction = false;
  let testReceipt = null;
  
  // Check last 50 blocks
  for (let i = 0; i < 50 && currentBlock - i > 0; i++) {
    const blockNum = currentBlock - i;
    const block = await ethers.provider.getBlock(blockNum, true);
    
    if (block && block.transactions) {
      for (const txHash of block.transactions) {
        try {
          const tx = await ethers.provider.getTransaction(txHash);
          if (tx && tx.to && tx.to.toLowerCase() === LendingPoolAddress.toLowerCase()) {
            // Check if it's a lend transaction (has data)
            if (tx.data && tx.data.length > 10) {
              const receipt = await ethers.provider.getTransactionReceipt(txHash);
              
              // Check for Supplied event
              const lendingPoolInterface = new ethers.Interface([
                "event Supplied(address indexed user, address indexed asset, uint256 amount)"
              ]);
              
              for (const log of receipt.logs) {
                try {
                  const parsed = lendingPoolInterface.parseLog(log);
                  if (parsed && parsed.name === "Supplied") {
                    foundTransaction = true;
                    testReceipt = receipt;
                    console.log("✅ Found supply transaction!");
                    console.log("   Block:", blockNum);
                    console.log("   Hash:", txHash);
                    console.log("   User:", parsed.args.user);
                    console.log("   Asset:", parsed.args.asset);
                    console.log("   Amount:", ethers.formatEther(parsed.args.amount));
                    console.log();
                    break;
                  }
                } catch (e) {
                  // Not a Supplied event
                }
              }
              
              if (foundTransaction) break;
            }
          }
        } catch (e) {
          // Skip errors
        }
      }
      if (foundTransaction) break;
    }
  }
  
  if (!foundTransaction) {
    console.log("❌ No recent supply transactions found");
    console.log("   Cannot test without a transaction");
    console.log("   → Please make a supply transaction first, then run this script again");
    process.exit(1);
  }
  
  const receipt = testReceipt;

  // Step 4: Check for RewardsAccumulated event in transaction
  console.log("3️⃣  CHECKING TRANSACTION EVENTS");
  console.log("-".repeat(70));
  const rewardAccumulatorInterface = new ethers.Interface([
    "event RewardsAccumulated(address indexed user, uint256 amount)"
  ]);
  
  let foundRewardEvent = false;
  for (const log of receipt.logs) {
    try {
      const parsed = rewardAccumulatorInterface.parseLog(log);
      if (parsed && parsed.name === "RewardsAccumulated") {
        foundRewardEvent = true;
        console.log("✅ Found RewardsAccumulated event!");
        console.log("   User:", parsed.args.user);
        console.log("   Amount:", ethers.formatEther(parsed.args.amount), "LENDX");
      }
    } catch (e) {
      // Not a RewardsAccumulated event, continue
    }
  }
  
  if (!foundRewardEvent) {
    console.log("❌ NO RewardsAccumulated event found in transaction!");
    console.log("   This means _accumulateRewards was NOT called");
    console.log("   → LendingPool on-chain does NOT have the new code");
    console.log("   → NEED TO REDEPLOY LendingPool");
  }
  console.log();

  // Step 5: Check claimable reward immediately after
  console.log("4️⃣  CHECKING CLAIMABLE REWARD AFTER TRANSACTION");
  console.log("-".repeat(70));
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  const newClaimable = await rewardDistributor.getClaimableReward(userAddress);
  const rewardIncrease = newClaimable - initialClaimable;
  
  console.log("New claimable reward:", ethers.formatEther(newClaimable), "LENDX");
  console.log("Reward increase:", ethers.formatEther(rewardIncrease), "LENDX");
  console.log();

  // Step 6: Conclusion
  console.log("5️⃣  CONCLUSION");
  console.log("=".repeat(70));
  if (foundRewardEvent && rewardIncrease > 0n) {
    console.log("✅ SUCCESS: Reward can be claimed immediately!");
    console.log("   → LendingPool has the new code with _accumulateRewards");
    console.log("   → NO NEED TO REDEPLOY");
  } else if (foundRewardEvent && rewardIncrease === 0n) {
    console.log("⚠️  PARTIAL: RewardsAccumulated event found but reward = 0");
    console.log("   → This might be because:");
    console.log("      - Time elapsed is too short");
    console.log("      - Supply balance was 0 before");
    console.log("   → LendingPool has the new code, but reward calculation needs time");
  } else {
    console.log("❌ FAILURE: Reward cannot be claimed immediately");
    console.log("   → LendingPool on-chain does NOT have the new code");
    console.log("   → NEED TO REDEPLOY LendingPool");
    console.log();
    console.log("   Run: npx hardhat run scripts/redeploy_lendingpool_with_rewards.cjs --network ganache");
  }
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

