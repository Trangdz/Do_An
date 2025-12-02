const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Test supply transaction and check if rewards are accumulated
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

  console.log("🧪 TESTING SUPPLY AND REWARD ACCUMULATION");
  console.log("=".repeat(70));
  console.log();

  const lendingPool = await hre.ethers.getContractAt("LendingPool", LendingPoolAddress);
  const rewardDistributor = await hre.ethers.getContractAt("RewardDistributor", RewardDistributorAddress);
  const rewardAccumulator = await hre.ethers.getContractAt("RewardAccumulator", RewardAccumulatorAddress);
  const dai = await hre.ethers.getContractAt("IERC20", DAIAddress);

  // Check initial state
  console.log("1️⃣  CHECKING INITIAL STATE");
  console.log("-".repeat(70));
  const initialClaimable = await rewardDistributor.getClaimableReward(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Initial claimable reward:", ethers.formatEther(initialClaimable), "LENDX");
  console.log();

  // Approve and supply
  console.log("2️⃣  MAKING SUPPLY TRANSACTION");
  console.log("-".repeat(70));
  const supplyAmount = ethers.parseEther("0.0001");
  
  // Approve
  const allowance = await dai.allowance(deployer.address, LendingPoolAddress);
  if (allowance < supplyAmount) {
    console.log("Approving DAI...");
    const approveTx = await dai.approve(LendingPoolAddress, ethers.parseEther("1000"));
    await approveTx.wait();
    console.log("✅ Approved");
  }

  // Supply
  console.log("Supplying", ethers.formatEther(supplyAmount), "DAI...");
  const supplyTx = await lendingPool.lend(DAIAddress, supplyAmount);
  const receipt = await supplyTx.wait();
  console.log("✅ Supply transaction successful!");
  console.log("   Transaction hash:", supplyTx.hash);
  console.log();

  // Check for RewardsAccumulated event
  console.log("3️⃣  CHECKING FOR REWARDSACCUMULATED EVENT");
  console.log("-".repeat(70));
  const rewardAccumulatorInterface = new ethers.Interface([
    "event RewardsAccumulated(address indexed user, uint256 amount)"
  ]);
  
  let foundRewardEvent = false;
  let rewardAmount = 0n;
  for (const log of receipt.logs) {
    try {
      const parsed = rewardAccumulatorInterface.parseLog(log);
      if (parsed && parsed.name === "RewardsAccumulated") {
        foundRewardEvent = true;
        rewardAmount = parsed.args.amount;
        console.log("✅ Found RewardsAccumulated event!");
        console.log("   User:", parsed.args.user);
        console.log("   Amount:", ethers.formatEther(parsed.args.amount), "LENDX");
      }
    } catch (e) {
      // Not a RewardsAccumulated event
    }
  }
  
  if (!foundRewardEvent) {
    console.log("❌ NO RewardsAccumulated event found!");
    console.log("   → LendingPool does NOT have _accumulateRewards() function");
    console.log("   → NEED TO REDEPLOY LendingPool");
  }
  console.log();

  // Check claimable reward after
  console.log("4️⃣  CHECKING CLAIMABLE REWARD AFTER TRANSACTION");
  console.log("-".repeat(70));
  await new Promise(resolve => setTimeout(resolve, 1000));
  const newClaimable = await rewardDistributor.getClaimableReward(deployer.address);
  const rewardIncrease = newClaimable - initialClaimable;
  
  console.log("New claimable reward:", ethers.formatEther(newClaimable), "LENDX");
  console.log("Reward increase:", ethers.formatEther(rewardIncrease), "LENDX");
  console.log();

  // Conclusion
  console.log("5️⃣  CONCLUSION");
  console.log("=".repeat(70));
  if (foundRewardEvent && rewardIncrease > 0n) {
    console.log("✅ SUCCESS: Reward system is working!");
    console.log("   → LendingPool has the new code");
    console.log("   → Rewards are being accumulated");
    console.log("   → User can claim rewards immediately");
  } else if (foundRewardEvent && rewardIncrease === 0n) {
    console.log("⚠️  PARTIAL: RewardsAccumulated event found but reward = 0");
    console.log("   → This might be because:");
    console.log("      - Time elapsed is too short");
    console.log("      - Supply balance was 0 before");
    console.log("   → Try waiting a few seconds and supply again");
  } else {
    console.log("❌ FAILURE: Reward system is NOT working");
    console.log("   → LendingPool does NOT have the new code");
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












