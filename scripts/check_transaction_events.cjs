const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Check recent transactions for reward events
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
  const userAddress = getAddress("User1Address");

  console.log("🔍 CHECKING RECENT TRANSACTIONS FOR REWARD EVENTS");
  console.log("=".repeat(70));
  console.log();

  // Get recent blocks
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  console.log("Checking last 50 blocks...");
  console.log();

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  // Event interfaces
  const accumulatorInterface = new ethers.Interface([
    "event RewardsAccumulated(address indexed user, uint256 amount)"
  ]);

  const poolInterface = new ethers.Interface([
    "event Supplied(address indexed user, address indexed asset, uint256 amount)",
    "event RewardUpdateFailed(address indexed user, address indexed asset, bytes returnData)"
  ]);

  let foundSupplyEvents = 0;
  let foundRewardEvents = 0;
  let foundFailedEvents = 0;

  // Check last 50 blocks
  for (let i = 0; i < 50 && (currentBlock - i) >= 0; i++) {
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
                if (parsed.args.user.toLowerCase() === userAddress.toLowerCase()) {
                  foundSupplyEvents++;
                  console.log(`✅ Found Supplied event at block ${blockNumber}`);
                  console.log(`   User: ${parsed.args.user}`);
                  console.log(`   Asset: ${parsed.args.asset}`);
                  console.log(`   Amount: ${ethers.formatEther(parsed.args.amount)}`);
                  console.log(`   Transaction: ${txHash}`);
                  console.log();

                  // Check for RewardsAccumulated event in same transaction
                  let foundReward = false;
                  for (const log2 of receipt.logs) {
                    try {
                      const parsed2 = accumulatorInterface.parseLog(log2);
                      if (parsed2 && parsed2.name === "RewardsAccumulated") {
                        if (parsed2.args.user.toLowerCase() === userAddress.toLowerCase()) {
                          foundRewardEvents++;
                          foundReward = true;
                          console.log(`   🎁 Found RewardsAccumulated event!`);
                          console.log(`      Amount: ${ethers.formatEther(parsed2.args.amount)} LENDX`);
                          console.log();
                        }
                      }
                    } catch (e) {
                      // Not the event we're looking for
                    }
                  }

                  // Check for RewardUpdateFailed event
                  for (const log3 of receipt.logs) {
                    try {
                      const parsed3 = poolInterface.parseLog(log3);
                      if (parsed3 && parsed3.name === "RewardUpdateFailed") {
                        if (parsed3.args.user.toLowerCase() === userAddress.toLowerCase()) {
                          foundFailedEvents++;
                          console.log(`   ❌ Found RewardUpdateFailed event!`);
                          console.log(`      This means _updateSupplyReward failed`);
                          console.log(`      Return data: ${parsed3.args.returnData}`);
                          console.log();
                        }
                      }
                    } catch (e) {
                      // Not the event we're looking for
                    }
                  }

                  if (!foundReward && foundFailedEvents === 0) {
                    console.log(`   ⚠️  No RewardsAccumulated event found`);
                    console.log(`   ⚠️  No RewardUpdateFailed event found`);
                    console.log(`   💡 This means _updateSupplyReward might not have been called`);
                    console.log(`      OR the call succeeded but no reward was calculated`);
                    console.log();
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

  console.log("=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  console.log(`Found ${foundSupplyEvents} Supplied events`);
  console.log(`Found ${foundRewardEvents} RewardsAccumulated events`);
  console.log(`Found ${foundFailedEvents} RewardUpdateFailed events`);
  console.log();

  if (foundSupplyEvents > 0 && foundRewardEvents === 0 && foundFailedEvents === 0) {
    console.log("⚠️  PROBLEM DETECTED:");
    console.log("   User has supplied tokens but no reward events found!");
    console.log("   This means _updateSupplyReward is either:");
    console.log("   1. Not being called");
    console.log("   2. Being called but failing silently");
    console.log("   3. Being called but reward calculation returns 0");
    console.log();
    console.log("💡 Check LendingPool code - is _updateSupplyReward called in lend()?");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

















