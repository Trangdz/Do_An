const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Trigger reward accumulation for a user by making a small supply transaction
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
  const User1Address = getAddress("User1Address");

  console.log("🎁 TRIGGERING REWARD FOR USER");
  console.log("=".repeat(70));
  console.log();

  const lendingPool = await hre.ethers.getContractAt("LendingPool", LendingPoolAddress);
  const rewardDistributor = await hre.ethers.getContractAt("RewardDistributor", RewardDistributorAddress);
  const dai = await hre.ethers.getContractAt("IERC20", DAIAddress);

  // Use User1 or from env
  const userAddress = process.env.USER_ADDRESS || User1Address;
  
  console.log("User address:", userAddress);
  console.log();

  // Check initial claimable reward
  console.log("1️⃣  CHECKING INITIAL STATE");
  console.log("-".repeat(70));
  const initialClaimable = await rewardDistributor.getClaimableReward(userAddress);
  console.log("Initial claimable reward:", ethers.formatEther(initialClaimable), "LENDX");
  console.log();

  // Check if user has supply
  const userReserve = await lendingPool.userReserves(userAddress, DAIAddress);
  const currentSupply = userReserve.supply.principal;
  console.log("Current supply:", ethers.formatEther(currentSupply), "DAI");
  console.log();

  if (currentSupply === 0n) {
    console.log("❌ User has no supply. Cannot trigger reward.");
    console.log("   → User needs to supply tokens first");
    return;
  }

  // Make a tiny supply to trigger reward accumulation
  console.log("2️⃣  MAKING TINY SUPPLY TO TRIGGER REWARD");
  console.log("-".repeat(70));
  
  // Note: We can't impersonate on Ganache easily, so we'll just tell user what to do
  console.log("💡 To trigger reward accumulation, user needs to:");
  console.log("   1. Go to frontend");
  console.log("   2. Supply a tiny amount (0.0001 DAI) or withdraw a tiny amount");
  console.log("   3. This will trigger reward accumulation");
  console.log("   4. Reward will become claimable");
  console.log();
  
  // Calculate expected reward
  const rewardAccumulator = await hre.ethers.getContractAt("RewardAccumulator", getAddress("RewardAccumulatorAddress"));
  const lastUpdateTime = await rewardAccumulator.lastUpdateTime(userAddress, DAIAddress);
  const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(userAddress, DAIAddress);
  const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
  
  if (lastUpdateTime > 0n && lastSupplyBalance > 0n) {
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const timeElapsed = currentTime - lastUpdateTime;
    const expectedReward = (lastSupplyBalance * supplyRate * timeElapsed) / ethers.parseUnits("1", 18);
    
    console.log("3️⃣  EXPECTED REWARD AFTER TRANSACTION");
    console.log("-".repeat(70));
    console.log("Time elapsed:", timeElapsed.toString(), "seconds");
    console.log("Expected reward to accumulate:", ethers.formatEther(expectedReward), "LENDX");
    console.log();
    
    if (expectedReward > 0n) {
      console.log("✅ After user makes a transaction:");
      console.log("   → Reward will be accumulated:", ethers.formatEther(expectedReward), "LENDX");
      console.log("   → User can then claim this reward");
    }
  }
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
