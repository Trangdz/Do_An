const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @notice Fix reward system configuration
 * This script will:
 * 1. Check if RewardAccumulator is deployed
 * 2. Deploy if not deployed
 * 3. Configure all contracts properly
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Load addresses from addresses.js
  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const LendingPoolAddress = getAddress("LendingPoolAddress");
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const RewardAccumulatorAddress = getAddress("RewardAccumulatorAddress");
  const LENDXTokenAddress = getAddress("LENDXTokenAddress");

  console.log("📋 Current addresses:");
  console.log("   LendingPool:", LendingPoolAddress);
  console.log("   RewardDistributor:", RewardDistributorAddress);
  console.log("   RewardAccumulator:", RewardAccumulatorAddress);
  console.log("   LENDXToken:", LENDXTokenAddress);
  console.log();

  // Check if RewardAccumulator is deployed
  let rewardAccumulator;
  let accumulatorAddress = RewardAccumulatorAddress;
  
  if (accumulatorAddress && accumulatorAddress !== "0x0000000000000000000000000000000000000000") {
    const code = await ethers.provider.getCode(accumulatorAddress);
    if (code === "0x") {
      console.log("⚠️  RewardAccumulator address exists but contract not deployed. Deploying new one...\n");
      accumulatorAddress = null;
    } else {
      console.log("✅ RewardAccumulator is deployed at:", accumulatorAddress);
      const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
      rewardAccumulator = RewardAccumulator.attach(accumulatorAddress);
    }
  }

  // Deploy RewardAccumulator if needed
  if (!accumulatorAddress || accumulatorAddress === "0x0000000000000000000000000000000000000000") {
    console.log("1️⃣  Deploying RewardAccumulator...");
    const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
    rewardAccumulator = await RewardAccumulator.deploy(
      RewardDistributorAddress,
      deployer.address // initial owner
    );
    await rewardAccumulator.waitForDeployment();
    accumulatorAddress = await rewardAccumulator.getAddress();
    console.log("   ✅ RewardAccumulator deployed:", accumulatorAddress);
  } else {
    const RewardAccumulator = await hre.ethers.getContractFactory("RewardAccumulator");
    rewardAccumulator = RewardAccumulator.attach(accumulatorAddress);
  }

  // Get contracts
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(LendingPoolAddress);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = RewardDistributor.attach(RewardDistributorAddress);

  // 2. Configure RewardDistributor
  console.log("\n2️⃣  Configuring RewardDistributor...");
  try {
    const currentAccumulator = await rewardDistributor.rewardAccumulator();
    if (currentAccumulator.toLowerCase() !== accumulatorAddress.toLowerCase()) {
      console.log("   Setting RewardAccumulator in RewardDistributor...");
      const setTx = await rewardDistributor.setRewardAccumulator(accumulatorAddress);
      await setTx.wait();
      console.log("   ✅ RewardAccumulator set in RewardDistributor");
    } else {
      console.log("   ✅ RewardAccumulator already set in RewardDistributor");
    }
  } catch (error) {
    console.error("   ❌ Error configuring RewardDistributor:", error.message);
  }

  // 3. Configure LendingPool
  console.log("\n3️⃣  Configuring LendingPool...");
  try {
    const currentAccumulator = await lendingPool.rewardAccumulator();
    if (currentAccumulator.toLowerCase() !== accumulatorAddress.toLowerCase()) {
      console.log("   Setting RewardAccumulator in LendingPool...");
      const setTx = await lendingPool.setRewardAccumulator(accumulatorAddress);
      await setTx.wait();
      console.log("   ✅ RewardAccumulator set in LendingPool");
    } else {
      console.log("   ✅ RewardAccumulator already set in LendingPool");
    }
  } catch (error) {
    console.error("   ❌ Error configuring LendingPool:", error.message);
  }

  // 4. Configure RewardAccumulator
  console.log("\n4️⃣  Configuring RewardAccumulator...");
  try {
    const currentLendingPool = await rewardAccumulator.lendingPool();
    if (currentLendingPool.toLowerCase() !== LendingPoolAddress.toLowerCase()) {
      console.log("   Setting LendingPool in RewardAccumulator...");
      const setTx = await rewardAccumulator.setLendingPool(LendingPoolAddress);
      await setTx.wait();
      console.log("   ✅ LendingPool set in RewardAccumulator");
    } else {
      console.log("   ✅ LendingPool already set in RewardAccumulator");
    }
  } catch (error) {
    console.error("   ❌ Error configuring RewardAccumulator:", error.message);
  }

  // 5. Update addresses.js if needed
  if (accumulatorAddress !== RewardAccumulatorAddress) {
    console.log("\n5️⃣  Updating addresses.js...");
    try {
      let content = fs.readFileSync(addressesPath, "utf8");
      // Replace existing RewardAccumulatorAddress
      content = content.replace(
        /export const RewardAccumulatorAddress\s*=\s*"[^"]+";/g,
        `export const RewardAccumulatorAddress = "${accumulatorAddress}";`
      );
      fs.writeFileSync(addressesPath, content);
      console.log("   ✅ addresses.js updated");
    } catch (error) {
      console.error("   ❌ Error updating addresses.js:", error.message);
    }
  }

  // 6. Verify configuration
  console.log("\n6️⃣  Verifying configuration...");
  try {
    const poolAccumulator = await lendingPool.rewardAccumulator();
    const distributorAccumulator = await rewardDistributor.rewardAccumulator();
    const accumulatorLendingPool = await rewardAccumulator.lendingPool();
    const accumulatorDistributor = await rewardAccumulator.rewardDistributor();

    console.log("   LendingPool.rewardAccumulator:", poolAccumulator);
    console.log("   RewardDistributor.rewardAccumulator:", distributorAccumulator);
    console.log("   RewardAccumulator.lendingPool:", accumulatorLendingPool);
    console.log("   RewardAccumulator.rewardDistributor:", accumulatorDistributor);

    if (
      poolAccumulator.toLowerCase() === accumulatorAddress.toLowerCase() &&
      distributorAccumulator.toLowerCase() === accumulatorAddress.toLowerCase() &&
      accumulatorLendingPool.toLowerCase() === LendingPoolAddress.toLowerCase() &&
      accumulatorDistributor.toLowerCase() === RewardDistributorAddress.toLowerCase()
    ) {
      console.log("\n   ✅ All configurations are correct!");
    } else {
      console.log("\n   ⚠️  Some configurations may be incorrect. Please check above.");
    }
  } catch (error) {
    console.error("   ❌ Error verifying configuration:", error.message);
  }

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║          ✅ REWARD SYSTEM CONFIGURATION COMPLETE                    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
  console.log("🎁 Reward system is now configured!");
  console.log("   - Supply/borrow/withdraw/repay will now accumulate rewards");
  console.log("   - Users can claim rewards from RewardDistributor");
  console.log("\n💡 Test by:");
  console.log("   1. Supply some tokens");
  console.log("   2. Wait a few seconds");
  console.log("   3. Check claimable rewards in the UI");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });











