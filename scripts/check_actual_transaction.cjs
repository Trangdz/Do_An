const hre = require("hardhat");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

/**
 * @notice Check actual supply transaction and see what events are emitted
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

  console.log("🔍 CHECKING ACTUAL TRANSACTIONS");
  console.log("=".repeat(70));
  console.log();

  // Get recent blocks and check for Supplied events
  const provider = ethers.provider;
  const currentBlock = await provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  console.log("Checking last 100 blocks for transactions...");
  console.log();

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  // Event interfaces
  const poolInterface = new ethers.Interface([
    "event Supplied(address indexed user, address indexed asset, uint256 amount)",
    "event RewardUpdateFailed(address indexed user, address indexed asset, bytes returnData)"
  ]);

  const accumulatorInterface = new ethers.Interface([
    "event RewardsAccumulated(address indexed user, uint256 amount)"
  ]);

  let supplyCount = 0;
  let rewardCount = 0;
  let failedCount = 0;

  // Check last 100 blocks
  for (let i = 0; i < 100 && (currentBlock - i) >= 0; i++) {
    const blockNumber = currentBlock - i;
    try {
      const block = await ethers.provider.getBlock(blockNumber, true);
      if (!block || !block.transactions) continue;

      for (const txHash of block.transactions) {
        try {
          const receipt = await ethers.provider.getTransactionReceipt(txHash);
          if (!receipt || !receipt.logs) continue;

          // Check for Supplied events
          for (const log of receipt.logs) {
            try {
              const parsed = poolInterface.parseLog(log);
              if (parsed && parsed.name === "Supplied") {
                if (parsed.args.user.toLowerCase() === userAddress.toLowerCase() ||
                    parsed.args.asset.toLowerCase() === DAIAddress.toLowerCase()) {
                  supplyCount++;
                  console.log(`\n📦 Found Supplied event at block ${blockNumber}`);
                  console.log(`   Transaction: ${txHash}`);
                  console.log(`   User: ${parsed.args.user}`);
                  console.log(`   Asset: ${parsed.args.asset}`);
                  console.log(`   Amount: ${ethers.formatEther(parsed.args.amount)}`);
                  
                  // Check for RewardsAccumulated in same transaction
                  let foundReward = false;
                  for (const log2 of receipt.logs) {
                    try {
                      const parsed2 = accumulatorInterface.parseLog(log2);
                      if (parsed2 && parsed2.name === "RewardsAccumulated") {
                        if (parsed2.args.user.toLowerCase() === parsed.args.user.toLowerCase()) {
                          rewardCount++;
                          foundReward = true;
                          console.log(`   🎁 RewardsAccumulated: ${ethers.formatEther(parsed2.args.amount)} LENDX`);
                        }
                      }
                    } catch (e) {
                      // Not the event
                    }
                  }

                  // Check for RewardUpdateFailed
                  for (const log3 of receipt.logs) {
                    try {
                      const parsed3 = poolInterface.parseLog(log3);
                      if (parsed3 && parsed3.name === "RewardUpdateFailed") {
                        if (parsed3.args.user.toLowerCase() === parsed.args.user.toLowerCase()) {
                          failedCount++;
                          console.log(`   ❌ RewardUpdateFailed!`);
                          console.log(`      Return data: ${parsed3.args.returnData}`);
                          
                          // Try to decode the error
                          if (parsed3.args.returnData && parsed3.args.returnData.length > 0) {
                            try {
                              // Check if it's a revert reason
                              const errorData = parsed3.args.returnData;
                              if (errorData.startsWith("0x08c379a0")) {
                                // Error(string) selector
                                const reason = ethers.AbiCoder.defaultAbiCoder().decode(
                                  ["string"],
                                  "0x" + errorData.slice(10)
                                )[0];
                                console.log(`      Error reason: ${reason}`);
                              } else {
                                console.log(`      Error data: ${errorData}`);
                              }
                            } catch (e) {
                              console.log(`      Could not decode error`);
                            }
                          }
                        }
                      }
                    } catch (e) {
                      // Not the event
                    }
                  }

                  if (!foundReward && failedCount === 0) {
                    console.log(`   ⚠️  No reward event found`);
                    console.log(`   💡 Possible reasons:`);
                    console.log(`      - First supply (initializes state, no reward)`);
                    console.log(`      - Call failed silently`);
                    console.log(`      - Reward calculation returned 0`);
                  }
                }
              }
            } catch (e) {
              // Not the event we're looking for
            }
          }
        } catch (e) {
          // Skip errors
        }
      }
    } catch (e) {
      // Skip block errors
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  console.log(`Found ${supplyCount} Supplied events`);
  console.log(`Found ${rewardCount} RewardsAccumulated events`);
  console.log(`Found ${failedCount} RewardUpdateFailed events`);
  console.log();

  if (supplyCount > 0 && rewardCount === 0 && failedCount === 0) {
    console.log("🔴 PROBLEM IDENTIFIED:");
    console.log("   User has supplied but:");
    console.log("   - No RewardsAccumulated event");
    console.log("   - No RewardUpdateFailed event");
    console.log();
    console.log("   This means:");
    console.log("   1. Either _updateSupplyReward is not being called");
    console.log("   2. Or the call is succeeding but reward is 0");
    console.log("   3. Or the call is failing but not emitting event (old LendingPool code)");
    console.log();
    console.log("   💡 Check if LendingPool on-chain has RewardUpdateFailed event");
    console.log("      If not, it's the old code without _updateSupplyReward");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

