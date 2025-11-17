const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Redeploy RewardAccumulator with new code and configure it
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Load addresses
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const LendingPoolAddress = getAddress("LendingPoolAddress");
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const LENDXTokenAddress = getAddress("LENDXTokenAddress");

  console.log("📋 Current addresses:");
  console.log("   LendingPool:", LendingPoolAddress);
  console.log("   RewardDistributor:", RewardDistributorAddress);
  console.log();

  // 1. Deploy new RewardAccumulator
  console.log("1️⃣  Deploying new RewardAccumulator...");
  const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
  const rewardAccumulator = await RewardAccumulator.deploy(
    RewardDistributorAddress,
    deployer.address // initial owner
  );
  await rewardAccumulator.waitForDeployment();
  const accumulatorAddress = await rewardAccumulator.getAddress();
  console.log("   ✅ RewardAccumulator deployed:", accumulatorAddress);

  // 2. Configure RewardDistributor
  console.log("\n2️⃣  Configuring RewardDistributor...");
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);
  
  try {
    const setTx = await rewardDistributor.setRewardAccumulator(accumulatorAddress);
    await setTx.wait();
    console.log("   ✅ RewardAccumulator set in RewardDistributor");
  } catch (error) {
    console.error("   ❌ Error:", error.message);
    // Try to check if function exists
    try {
      const code = await ethers.provider.getCode(RewardDistributorAddress);
      console.log("   Checking RewardDistributor code...");
      // If setRewardAccumulator doesn't exist, we need to check owner
      const owner = await rewardDistributor.owner();
      console.log("   RewardDistributor owner:", owner);
      if (owner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("   ⚠️  setRewardAccumulator may not exist. Checking contract...");
      }
    } catch (e) {
      console.error("   Could not check contract:", e.message);
    }
  }

  // 3. Configure LendingPool
  console.log("\n3️⃣  Configuring LendingPool...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);
  
  try {
    const setTx = await lendingPool.setRewardAccumulator(accumulatorAddress);
    await setTx.wait();
    console.log("   ✅ RewardAccumulator set in LendingPool");
  } catch (error) {
    console.error("   ❌ Error:", error.message);
  }

  // 4. Configure RewardAccumulator
  console.log("\n4️⃣  Configuring RewardAccumulator...");
  try {
    const setTx = await rewardAccumulator.setLendingPool(LendingPoolAddress);
    await setTx.wait();
    console.log("   ✅ LendingPool set in RewardAccumulator");
  } catch (error) {
    console.error("   ❌ Error:", error.message);
  }

  // 5. Update addresses.js
  console.log("\n5️⃣  Updating addresses.js...");
  try {
    let content = fs.readFileSync(addressesPath, "utf8");
    content = content.replace(
      /export const RewardAccumulatorAddress\s*=\s*"[^"]+";/g,
      `export const RewardAccumulatorAddress = "${accumulatorAddress}";`
    );
    fs.writeFileSync(addressesPath, content);
    console.log("   ✅ addresses.js updated");
  } catch (error) {
    console.error("   ❌ Error updating addresses.js:", error.message);
  }

  // 6. Verify
  console.log("\n6️⃣  Verifying...");
  try {
    const poolAccumulator = await lendingPool.rewardAccumulator();
    const distributorAccumulator = await rewardDistributor.rewardAccumulator();
    const accumulatorLendingPool = await rewardAccumulator.lendingPool();

    console.log("   LendingPool.rewardAccumulator:", poolAccumulator);
    console.log("   RewardDistributor.rewardAccumulator:", distributorAccumulator);
    console.log("   RewardAccumulator.lendingPool:", accumulatorLendingPool);

    if (
      poolAccumulator.toLowerCase() === accumulatorAddress.toLowerCase() &&
      distributorAccumulator.toLowerCase() === accumulatorAddress.toLowerCase() &&
      accumulatorLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase()
    ) {
      console.log("\n   ✅ All configurations correct!");
    }
  } catch (error) {
    console.error("   ❌ Verification error:", error.message);
  }

  console.log("\n✅ Done! Reward system should now work.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



