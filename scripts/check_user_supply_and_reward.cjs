const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Check user supply and reward state
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
  const userAddress = "0x767548d92f8B8138742675bA45609E5AD26568e8"; // User1 from console log

  console.log("🔍 CHECKING USER SUPPLY AND REWARD STATE");
  console.log("=".repeat(70));
  console.log();

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Check user supply
  console.log("1️⃣  USER SUPPLY STATE");
  console.log("-".repeat(70));
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const supplyPrincipal = userReserve.supply.principal;
  console.log("User:", userAddress);
  console.log("Supply:", ethers.formatEther(supplyPrincipal), "DAI");
  console.log();

  // Check RewardAccumulator state
  console.log("2️⃣  REWARD ACCUMULATOR STATE");
  console.log("-".repeat(70));
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  console.log("Last update time:", lastUpdateTime.toString());
  console.log("  (0 means not initialized)");
  console.log("Last supply balance:", ethers.formatEther(lastSupplyBalance), "DAI");
  console.log();

  // Check RewardDistributor state
  console.log("3️⃣  REWARD DISTRIBUTOR STATE");
  console.log("-".repeat(70));
  const claimableReward = await rewardDistributor.getClaimableReward(userAddress);
  console.log("Claimable reward:", ethers.formatEther(claimableReward), "LENDX");
  console.log();

  // Check if state is initialized
  console.log("4️⃣  STATE ANALYSIS");
  console.log("-".repeat(70));
  if (lastUpdateTime === 0n) {
    console.log("❌ State NOT initialized");
    console.log("   User needs to supply tokens to initialize state");
    console.log("   After first supply, state will be initialized");
    console.log("   Then on second supply/withdraw, reward will be calculated");
  } else {
    console.log("✅ State initialized");
    console.log("   Last update time:", new Date(Number(lastUpdateTime) * 1000).toLocaleString());
    
    if (lastSupplyBalance !== supplyPrincipal) {
      console.log("⚠️  State mismatch:");
      console.log("   Last supply balance:", ethers.formatEther(lastSupplyBalance), "DAI");
      console.log("   Current supply:", ethers.formatEther(supplyPrincipal), "DAI");
      console.log("   User needs to supply/withdraw to update state");
    } else {
      console.log("✅ State matches current supply");
      
      // Calculate expected reward
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const timeElapsed = currentTime - lastUpdateTime;
      const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
      const expectedReward = (lastSupplyBalance * supplyRate * timeElapsed) / ethers.parseUnits("1", 18);
      
      console.log("   Time elapsed:", timeElapsed.toString(), "seconds");
      console.log("   Expected reward:", ethers.formatEther(expectedReward), "LENDX");
      console.log("   Claimable reward:", ethers.formatEther(claimableReward), "LENDX");
      
      if (expectedReward > 0n && claimableReward === 0n) {
        console.log();
        console.log("   ⚠️  PROBLEM: Expected reward > 0 but claimable = 0");
        console.log("   This means reward was not accumulated");
        console.log("   Possible reasons:");
        console.log("     1. User hasn't done second supply/withdraw to trigger calculation");
        console.log("     2. _updateSupplyReward failed (check RewardUpdateFailed events)");
        console.log("     3. accumulateReward failed silently");
      }
    }
  }
  console.log();

  // Check recent transactions
  console.log("5️⃣  RECENT TRANSACTIONS");
  console.log("-".repeat(70));
  const provider = ethers.provider;
  const currentBlock = await provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  console.log("Checking last 50 blocks for Supplied events...");
  console.log();

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

  for (let i = 0; i < 50 && (currentBlock - i) >= 0; i++) {
    const blockNumber = currentBlock - i;
    try {
      const block = await provider.getBlock(blockNumber, true);
      if (!block || !block.transactions) continue;

      for (const txHash of block.transactions) {
        try {
          const receipt = await provider.getTransactionReceipt(txHash);
          if (!receipt || !receipt.logs) continue;

          for (const log of receipt.logs) {
            try {
              const parsed = poolInterface.parseLog(log);
              if (parsed && parsed.name === "Supplied") {
                if (parsed.args.user.toLowerCase() === userAddress.toLowerCase()) {
                  supplyCount++;
                  console.log(`📦 Supply at block ${blockNumber}: ${ethers.formatEther(parsed.args.amount)} DAI`);
                  
                  // Check for rewards
                  for (const log2 of receipt.logs) {
                    try {
                      const parsed2 = accumulatorInterface.parseLog(log2);
                      if (parsed2 && parsed2.name === "RewardsAccumulated") {
                        if (parsed2.args.user.toLowerCase() === userAddress.toLowerCase()) {
                          rewardCount++;
                          console.log(`   🎁 Reward: ${ethers.formatEther(parsed2.args.amount)} LENDX`);
                        }
                      }
                    } catch (e) {}
                  }

                  // Check for failures
                  for (const log3 of receipt.logs) {
                    try {
                      const parsed3 = poolInterface.parseLog(log3);
                      if (parsed3 && parsed3.name === "RewardUpdateFailed") {
                        if (parsed3.args.user.toLowerCase() === userAddress.toLowerCase()) {
                          failedCount++;
                          console.log(`   ❌ RewardUpdateFailed!`);
                        }
                      }
                    } catch (e) {}
                  }
                }
              }
            } catch (e) {}
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  console.log();
  console.log("=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  console.log(`Supplies found: ${supplyCount}`);
  console.log(`Rewards accumulated: ${rewardCount}`);
  console.log(`Failures: ${failedCount}`);
  console.log();

  if (supplyCount > 0 && rewardCount === 0 && failedCount === 0) {
    console.log("💡 DIAGNOSIS:");
    console.log("   User has supplied but no rewards accumulated");
    console.log("   This is expected if:");
    console.log("   1. First supply (initializes state, no reward)");
    console.log("   2. Need second supply/withdraw to trigger reward calculation");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });








