const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Fix RewardAccumulator.lendingPool to point to new LendingPool
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
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

  console.log("📋 Addresses:");
  console.log("   LendingPool (new):", LendingPoolAddress);
  console.log("   RewardAccumulator:", RewardAccumulatorAddress);
  console.log();

  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = RewardAccumulator.attach(RewardAccumulatorAddress);

  // Check current state
  const currentLendingPool = await rewardAccumulator.lendingPool();
  console.log("Current RewardAccumulator.lendingPool:", currentLendingPool);
  console.log("Expected:", LendingPoolAddress);
  console.log("Match:", currentLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase());
  console.log();

  // Fix: Set new LendingPool
  if (currentLendingPool.toLowerCase() !== LendingPoolAddress.toLowerCase()) {
    console.log("🔧 Fixing RewardAccumulator.lendingPool...");
    try {
      const setTx = await rewardAccumulator.setLendingPool(LendingPoolAddress);
      await setTx.wait();
      console.log("   ✅ Successfully updated!");
      
      // Verify
      const newLendingPool = await rewardAccumulator.lendingPool();
      console.log("   Verified new lendingPool:", newLendingPool);
      if (newLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase()) {
        console.log("   ✅ Verification passed!");
      }
    } catch (error) {
      console.error("   ❌ Error:", error.message);
      if (error.message.includes("only owner")) {
        console.log("   💡 Deployer is not owner. Owner is:", await rewardAccumulator.owner());
      }
    }
  } else {
    console.log("✅ RewardAccumulator.lendingPool is already correct!");
  }

  console.log();
  console.log("🎁 After fixing:");
  console.log("   1. User supplies tokens");
  console.log("   2. LendingPool calls RewardAccumulator.updateSupplyBalance()");
  console.log("   3. Reward will be accumulated!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });










