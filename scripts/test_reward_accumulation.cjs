const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Test reward accumulation after supply
 */
async function main() {
  const [deployer, user] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Test User:", user.address);
  console.log();

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

  console.log("📋 Addresses:");
  console.log("   LendingPool:", LendingPoolAddress);
  console.log("   RewardAccumulator:", RewardAccumulatorAddress);
  console.log("   RewardDistributor:", RewardDistributorAddress);
  console.log("   DAI:", DAIAddress);
  console.log();

  // Get contracts
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // Check configuration
  console.log("1️⃣  Checking configuration...");
  const poolAccumulator = await lendingPool.rewardAccumulator();
  const accumulatorLendingPool = await rewardAccumulator.lendingPool();
  const accumulatorDistributor = await rewardAccumulator.rewardDistributor();
  const distributorAccumulator = await rewardDistributor.rewardAccumulator();

  console.log("   LendingPool.rewardAccumulator:", poolAccumulator);
  console.log("   RewardAccumulator.lendingPool:", accumulatorLendingPool);
  console.log("   RewardAccumulator.rewardDistributor:", accumulatorDistributor);
  console.log("   RewardDistributor.rewardAccumulator:", distributorAccumulator);
  console.log();

  // Check if user has supply
  console.log("2️⃣  Checking user supply...");
  try {
    const userReserve = await lendingPool.userReserves(user.address, DAIAddress);
    const supplyPrincipal = userReserve.supply.principal;
    console.log("   User supply principal:", ethers.formatEther(supplyPrincipal), "DAI");
    
    if (supplyPrincipal === 0n) {
      console.log("   ⚠️  User has no supply. Please supply some tokens first.");
      return;
    }

    // Check reward accumulator state
    console.log("\n3️⃣  Checking RewardAccumulator state...");
    const lastUpdateTime = await rewardAccumulator.lastUpdateTime(user.address, DAIAddress);
    const lastSupplyBalance = await rewardAccumulator.lastSupplyBalance(user.address, DAIAddress);
    
    console.log("   Last update time:", lastUpdateTime.toString());
    console.log("   Last supply balance:", ethers.formatEther(lastSupplyBalance), "DAI");
    console.log("   Current time:", Math.floor(Date.now() / 1000));
    console.log("   Time since last update:", Math.floor(Date.now() / 1000) - Number(lastUpdateTime), "seconds");
    console.log();

    // Check claimable reward
    console.log("4️⃣  Checking claimable reward...");
    const claimableReward = await rewardDistributor.getClaimableReward(user.address);
    console.log("   Claimable reward:", ethers.formatEther(claimableReward), "LENDX");
    console.log();

    // Try to manually trigger accumulation
    console.log("5️⃣  Testing manual accumulation...");
    try {
      // Simulate what happens when supply is called
      // First, get current supply balance
      const currentSupply = await lendingPool.userReserves(user.address, DAIAddress);
      const currentSupplyBalance = currentSupply.supply.principal;
      
      console.log("   Current supply balance:", ethers.formatEther(currentSupplyBalance), "DAI");
      
      // Try to call updateSupplyBalance directly (this is what LendingPool should call)
      console.log("   Calling RewardAccumulator.updateSupplyBalance...");
      const updateTx = await rewardAccumulator.updateSupplyBalance(
        user.address,
        DAIAddress,
        currentSupplyBalance
      );
      await updateTx.wait();
      console.log("   ✅ Update transaction successful!");
      
      // Check reward again
      const newClaimableReward = await rewardDistributor.getClaimableReward(user.address);
      console.log("   New claimable reward:", ethers.formatEther(newClaimableReward), "LENDX");
      
      if (newClaimableReward > claimableReward) {
        const earned = newClaimableReward - claimableReward;
        console.log("   ✅ Earned:", ethers.formatEther(earned), "LENDX");
      } else {
        console.log("   ⚠️  No reward earned. This might be because:");
        console.log("      - Last update time is recent (no time elapsed)");
        console.log("      - Supply balance is 0");
        console.log("      - Reward rate is too low");
      }
      
    } catch (error) {
      console.error("   ❌ Error:", error.message);
      if (error.message.includes("only LendingPool")) {
        console.log("   ⚠️  Cannot call directly. Need to call from LendingPool.");
        console.log("   💡 This means the function is protected correctly.");
      }
    }

    // Check reward rates
    console.log("\n6️⃣  Checking reward rates...");
    const supplyRate = await rewardAccumulator.supplyRewardRatePerTokenPerSecond();
    const borrowRate = await rewardAccumulator.borrowRewardRatePerTokenPerSecond();
    console.log("   Supply rate:", ethers.formatEther(supplyRate), "LENDX per token per second");
    console.log("   Borrow rate:", ethers.formatEther(borrowRate), "LENDX per token per second");
    console.log();

    // Calculate expected reward
    if (lastUpdateTime > 0n && lastSupplyBalance > 0n) {
      const timeElapsed = BigInt(Math.floor(Date.now() / 1000)) - lastUpdateTime;
      const expectedReward = (lastSupplyBalance * supplyRate * timeElapsed) / ethers.parseUnits("1", 18);
      console.log("   Expected reward (if last update was accurate):", ethers.formatEther(expectedReward), "LENDX");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

















